import { useState } from 'react';
import { api } from '../../lib/api';

interface AIPanelProps {
  context: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ context }) => {
  const [summary, setSummary] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/summarize', {
        messages: context.split('\n').map((line) => {
          const [author, ...rest] = line.split(':');
          return { author, content: rest.join(':') };
        })
      });
      setSummary(data.summary);
      setSuggestions([]);
    } catch (error: any) {
      setSummary(error.response?.data?.message ?? 'AI summary unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/smart-reply', { context });
      setSuggestions(data.suggestions);
      setSummary('');
    } catch (error: any) {
      setSuggestions([error.response?.data?.message ?? 'Unable to fetch suggestions.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">AI Co-Pilot</h3>
        <div className="space-x-2">
          <button onClick={handleSummarize} className="rounded bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700" disabled={loading}>
            Summarize
          </button>
          <button onClick={handleSuggestions} className="rounded bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600" disabled={loading}>
            Smart replies
          </button>
        </div>
      </div>
      {summary && (
        <div className="mt-3 rounded border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
          {summary}
        </div>
      )}
      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="rounded border border-slate-800 bg-slate-900 p-2">
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
