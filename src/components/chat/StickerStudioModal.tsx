"use client";

/**
 * StickerStudioModal
 *
 * Lets users turn any photo into a chat sticker with client-side AI
 * background removal (zero server cost, runs via WebAssembly).
 *
 * Flow:
 *   1. User opens → drops / selects an image
 *   2. @imgly/background-removal runs in browser (streaming progress shown)
 *   3. Preview — cut-out on transparent background, white drop-shadow sticker style
 *   4. "Save Sticker" → upload to R2 → save URL to user_stickers table
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CheckCircle2, X, ImagePlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// Remove background lazily (it downloads ~5 MB of WASM + model on first use)
async function runBgRemoval(file: File): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  const result = await removeBackground(file, {
    output: { format: 'image/png', quality: 0.9 },
  });
  return result;
}

type Stage = 'select' | 'processing' | 'preview' | 'saving' | 'done';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the saved sticker URL */
  onStickerSaved?: (url: string) => void;
}

export default function StickerStudioModal({ open, onOpenChange, onStickerSaved }: Props) {
  const [stage, setStage] = useState<Stage>('select');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup previews on unmount / close
  useEffect(() => {
    if (!open) {
      setTimeout(reset, 300); // wait for exit animation
    }
  }, [open]);

  function reset() {
    setStage('select');
    setOriginalFile(null);
    if (originalPreview) URL.revokeObjectURL(originalPreview);
    if (processedPreview) URL.revokeObjectURL(processedPreview);
    setOriginalPreview(null);
    setProcessedBlob(null);
    setProcessedPreview(null);
    setProgress(0);
    setError(null);
    if (progressRef.current) clearInterval(progressRef.current);
  }

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    setOriginalFile(file);
    setOriginalPreview(URL.createObjectURL(file));
    setStage('processing');
    processImage(file);
  }, []);

  async function processImage(file: File) {
    setError(null);
    setProgress(0);

    // Fake "scanning" progress animation while the WASM runs
    let p = 0;
    progressRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 4, 92);
      setProgress(Math.floor(p));
    }, 200);

    try {
      const blob = await runBgRemoval(file);
      clearInterval(progressRef.current!);
      setProgress(100);
      setProcessedBlob(blob);
      setProcessedPreview(URL.createObjectURL(blob));
      setStage('preview');
    } catch (e) {
      clearInterval(progressRef.current!);
      setError('Background removal failed. Try a different photo.');
      setStage('select');
    }
  }

  async function handleSave() {
    if (!processedBlob) return;
    setStage('saving');
    try {
      const formData = new FormData();
      formData.append('file', processedBlob, `sticker-${Date.now()}.png`);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();

      // Save URL to user_stickers table
      const saveRes = await fetch('/api/stickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (!saveRes.ok) throw new Error('Failed to save sticker');

      setStage('done');
      onStickerSaved?.(url);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (e: any) {
      setError(e.message);
      setStage('preview');
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    noClick: false,
    disabled: stage !== 'select',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0 border border-border bg-card overflow-hidden rounded-2xl">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Sticker Studio
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            {/* ── SELECT stage ──── */}
            {stage === 'select' && (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error && (
                  <p className="text-xs text-destructive mb-3 text-center">{error}</p>
                )}
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors',
                    isDragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/60 hover:bg-muted/40',
                  )}
                >
                  <input {...getInputProps()} />
                  <ImagePlus className="w-10 h-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Drop a photo here</p>
                    <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">AI removes background — runs 100% in your browser</p>
                </div>
              </motion.div>
            )}

            {/* ── PROCESSING stage ──── */}
            {stage === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                {/* Original image with animated scan line */}
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-border">
                  {originalPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={originalPreview} alt="original" className="w-full h-full object-cover" />
                  )}
                  {/* Scanning line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_10px_2px_rgba(42,171,238,0.8)]"
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
                </div>

                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Removing background…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground/60 text-center">
                  Powered by AI — no data leaves your device
                </p>
              </motion.div>
            )}

            {/* ── PREVIEW stage ──── */}
            {(stage === 'preview' || stage === 'saving') && processedPreview && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center gap-4">
                  {/* Sticker preview — white outline drop-shadow */}
                  <div className="w-48 h-48 flex items-center justify-center rounded-xl bg-[repeating-conic-gradient(#3f3f4620_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={processedPreview}
                      alt="sticker preview"
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 0 4px white) drop-shadow(0 0 2px white)',
                      }}
                    />
                  </div>

                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={reset}
                      disabled={stage === 'saving'}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Redo
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSave}
                      disabled={stage === 'saving'}
                    >
                      {stage === 'saving' ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1" />
                      )}
                      {stage === 'saving' ? 'Saving…' : 'Save Sticker'}
                    </Button>
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              </motion.div>
            )}

            {/* ── DONE stage ──── */}
            {stage === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <p className="font-medium">Sticker saved!</p>
                <p className="text-xs text-muted-foreground">Available in your sticker tray</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
