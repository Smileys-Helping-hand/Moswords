import { formatDistanceToNow } from 'date-fns';

export interface FilePreview {
  _id: string;
  id?: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  fileCategory: 'image' | 'video' | 'audio' | 'document' | 'other';
  qualityMode: 'original' | 'optimized';
  qualityPercent?: number;
  createdAt: string;
  caption?: string | null;
  uploaderId?: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

interface Props {
  file: FilePreview;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  canDelete: boolean;
}

export const FilePreviewCard: React.FC<Props> = ({ file, isSelected, onToggleSelect, onDelete, canDelete }) => {
  const renderPreview = () => {
    if (file.fileCategory === 'image') {
      return <img src={file.url} alt={file.caption ?? file.originalName} className="h-32 w-full rounded object-cover" />;
    }

    if (file.fileCategory === 'video') {
      return (
        <video className="h-32 w-full rounded object-cover" controls>
          <source src={file.url} />
        </video>
      );
    }

    if (file.fileCategory === 'audio') {
      return (
        <audio controls className="w-full">
          <source src={file.url} />
        </audio>
      );
    }

    return (
      <div className="flex h-32 w-full items-center justify-center rounded bg-slate-900/60 text-sm text-slate-400">
        {file.fileCategory === 'document' ? 'Document' : 'File'} preview
      </div>
    );
  };

  return (
    <div className={`relative rounded-lg border ${isSelected ? 'border-brand-500' : 'border-slate-800'} bg-slate-900/60 p-4 transition hover:border-brand-500/70`}>
      <button
        type="button"
        onClick={() => onToggleSelect(file._id)}
        className={`absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-semibold ${isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700 bg-slate-950 text-slate-400'}`}
        aria-label={isSelected ? 'Deselect file' : 'Select file'}
      >
        {isSelected ? '✓' : '+'}
      </button>
      <div className="space-y-3">
        {renderPreview()}
        <div>
          <p className="truncate text-sm font-medium text-white" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-slate-400">
            {file.qualityMode === 'optimized' && file.qualityPercent ? `Optimized (${file.qualityPercent}%)` : 'Original'} • {formatBytes(file.size)} • {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
          </p>
          {file.caption && <p className="mt-1 text-xs text-slate-300">“{file.caption}”</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <a href={file.url} className="text-brand-400 hover:underline" target="_blank" rel="noreferrer">
            Open
          </a>
          {canDelete && (
            <button type="button" onClick={() => onDelete?.(file._id)} className="rounded border border-transparent px-2 py-1 text-red-300 transition hover:border-red-400 hover:text-red-200">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
