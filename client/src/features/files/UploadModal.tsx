import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { QualitySelector } from './QualitySelector';
import { FilePreview } from './FilePreviewCard';

interface Props {
  open: boolean;
  onClose: () => void;
  onUploaded: (files: FilePreview[]) => void;
}

interface PendingFile {
  file: File;
  id: string;
}

const generateId = () => Math.random().toString(36).slice(2);

export const UploadModal: React.FC<Props> = ({ open, onClose, onUploaded }) => {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [qualityMode, setQualityMode] = useState<'original' | 'optimized'>('original');
  const [qualityPercent, setQualityPercent] = useState(90);
  const [scope, setScope] = useState<'channel' | 'dm' | 'library'>('library');
  const [scopeId, setScopeId] = useState('');
  const [captioning, setCaptioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPending([]);
      setQualityMode('original');
      setQualityPercent(90);
      setScope('library');
      setScopeId('');
      setCaptioning(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (scope === 'library') {
      setScopeId('');
    }
  }, [scope]);

  const dropHandler = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    appendFiles(files);
  };

  const appendFiles = (files: File[]) => {
    setPending((prev) => [
      ...prev,
      ...files.map((file) => ({ file, id: `${file.name}-${generateId()}` }))
    ]);
  };

  const removeFile = (id: string) => {
    setPending((prev) => prev.filter((item) => item.id !== id));
  };

  const formDisabled = useMemo(() => loading || pending.length === 0, [loading, pending.length]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      pending.forEach(({ file }) => formData.append('files', file));
      formData.append('qualityMode', qualityMode);
      formData.append('qualityPercent', String(qualityPercent));
      formData.append('enableCaption', String(captioning));
      if (scope === 'channel') {
        formData.append('channelId', scopeId);
      }
      if (scope === 'dm') {
        formData.append('dmId', scopeId);
      }

      const { data } = await api.post<{ files: FilePreview[] }>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onUploaded(data.files);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Upload files</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">Close</button>
        </div>

        <div
          className="flex h-40 items-center justify-center rounded border border-dashed border-slate-700 bg-slate-950/60 text-sm text-slate-400"
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropHandler}
        >
          <div className="text-center">
            <p>Drag & drop or</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded bg-brand-500 px-3 py-1 text-sm font-medium text-white hover:bg-brand-600">
              Browse
              <input type="file" multiple className="hidden" onChange={(event) => appendFiles(Array.from(event.target.files || []))} />
            </label>
          </div>
        </div>

        {pending.length > 0 && (
          <ul className="space-y-2 text-sm text-slate-300">
            {pending.map(({ id, file }) => (
              <li key={id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="truncate pr-4">{file.name}</span>
                <button type="button" onClick={() => removeFile(id)} className="text-xs text-slate-400 hover:text-white">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Destination</label>
            <select value={scope} onChange={(event) => setScope(event.target.value as typeof scope)} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none">
              <option value="library">Personal library</option>
              <option value="channel">Channel</option>
              <option value="dm">Direct message</option>
            </select>
            {(scope === 'channel' || scope === 'dm') && (
              <input
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
                placeholder={scope === 'channel' ? 'Channel ID' : 'DM ID'}
                className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                required
              />
            )}
          </div>
          <div className="space-y-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Quality</label>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <button
                type="button"
                className={`rounded border px-3 py-1 ${qualityMode === 'original' ? 'border-brand-500 bg-brand-500/10 text-brand-200' : 'border-slate-700 text-slate-300'}`}
                onClick={() => setQualityMode('original')}
              >
                Original
              </button>
              <button
                type="button"
                className={`rounded border px-3 py-1 ${qualityMode === 'optimized' ? 'border-brand-500 bg-brand-500/10 text-brand-200' : 'border-slate-700 text-slate-300'}`}
                onClick={() => setQualityMode('optimized')}
              >
                Optimized
              </button>
            </div>
            <QualitySelector value={qualityPercent} onChange={setQualityPercent} disabled={qualityMode !== 'optimized'} />
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={captioning} onChange={(event) => setCaptioning(event.target.checked)} />
              Generate AI captions for images
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
            Cancel
          </button>
          <button type="submit" disabled={formDisabled} className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60">
            {loading ? 'Uploading…' : `Upload ${pending.length} file${pending.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
};
