import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { useRealtime } from '../../hooks/useRealtime';
import { FilePreview, FilePreviewCard } from './FilePreviewCard';
import { UploadModal } from './UploadModal';

interface ProgressPayload {
  fileName: string;
  status: string;
  progress: number;
  userId?: string;
}

type ScopeFilter = 'all' | 'mine' | 'channel' | 'dm';
type TypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'other';

export const FileDashboard: React.FC = () => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scope, setScope] = useState<ScopeFilter>('mine');
  const [scopeId, setScopeId] = useState('');
  const [type, setType] = useState<TypeFilter>('all');

  const user = useAuthStore((state) => state.user);
  const socket = useRealtime();

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if ((scope === 'channel' || scope === 'dm') && !scopeId) {
        setFiles([]);
        setSelection([]);
        setError('Enter an ID to filter channel or DM uploads.');
        return;
      }
      const params: Record<string, string> = {};
      if (scope === 'mine') {
        params.mine = 'true';
      }
      if (scope === 'all') {
        params.mine = 'false';
      }
      if (scope === 'channel' && scopeId) {
        params.channelId = scopeId;
      }
      if (scope === 'dm' && scopeId) {
        params.dmId = scopeId;
      }
      if (type !== 'all') {
        params.type = type;
      }

      const { data } = await api.get('/files', { params });
      setFiles(data.files);
      setSelection([]);
      setProgressMap({});
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to load files');
    } finally {
      setLoading(false);
    }
  }, [scope, scopeId, type]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (!socket || !user) return;

    const handler = (payload: ProgressPayload) => {
      if (payload.userId && payload.userId !== user.id) return;
      setProgressMap((prev) => ({ ...prev, [payload.fileName]: payload.progress }));
      if (payload.progress >= 100) {
        // give the server a moment to persist and then refresh the list
        setTimeout(() => {
          fetchFiles();
        }, 800);
      }
    };

    socket.on('file:progress', handler);
    return () => {
      socket.off('file:progress', handler);
    };
  }, [socket, user, fetchFiles]);

  const toggleSelection = (id: string) => {
    setSelection((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const onUploaded = (newFiles: FilePreview[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/files/${id}`);
      setFiles((prev) => prev.filter((file) => file._id !== id));
      setSelection((prev) => prev.filter((item) => item !== id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to delete file');
    }
  };

  const canDelete = useMemo(() => Boolean(user), [user]);

  const downloadSelected = async () => {
    if (selection.length === 0) return;
    try {
      setError(null);
      const { data } = await api.get('/files/download', {
        params: { ids: selection.join(',') },
        responseType: 'blob'
      });
      const blob = new Blob([data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `moswords-files-${Date.now()}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to download files');
    }
  };

  const progressMessage = useMemo(() => {
    const entries = Object.entries(progressMap);
    if (entries.length === 0) return null;
    const maxProgress = Math.max(...entries.map(([, pct]) => pct));
    const filename = entries[entries.length - 1][0];
    return `${filename}: ${maxProgress}%`;
  }, [progressMap]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">Scope</label>
            <select value={scope} onChange={(event) => setScope(event.target.value as ScopeFilter)} className="rounded border border-slate-700 bg-slate-950 px-3 py-1">
              <option value="all">All</option>
              <option value="mine">My uploads</option>
              <option value="channel">Channel</option>
              <option value="dm">Direct message</option>
            </select>
            {(scope === 'channel' || scope === 'dm') && (
              <input
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
                placeholder={scope === 'channel' ? 'Channel ID' : 'DM ID'}
                className="rounded border border-slate-700 bg-slate-950 px-3 py-1"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">Type</label>
            <select value={type} onChange={(event) => setType(event.target.value as TypeFilter)} className="rounded border border-slate-700 bg-slate-950 px-3 py-1">
              <option value="all">All</option>
              <option value="image">Images</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="document">Documents</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => setUploadOpen(true)} className="rounded bg-brand-500 px-4 py-2 font-medium text-white hover:bg-brand-600">
            Upload
          </button>
          <button
            type="button"
            onClick={downloadSelected}
            disabled={selection.length === 0}
            className="rounded border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500 disabled:opacity-50"
          >
            Download selected
          </button>
        </div>
      </div>

      {progressMessage && <p className="text-xs text-brand-300">{progressMessage}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">Loading files…</div>
      ) : files.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <FilePreviewCard
              key={file._id}
              file={file}
              isSelected={selection.includes(file._id)}
              onToggleSelect={toggleSelection}
              onDelete={handleDelete}
              canDelete={canDelete && (file.uploaderId ? file.uploaderId === user?.id : true)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          No files found for this filter.
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onUploaded} />
    </div>
  );
};
