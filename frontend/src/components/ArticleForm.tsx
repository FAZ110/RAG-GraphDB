import type { FormEvent } from 'react';
import { useState } from 'react';
import type { ExtractRequest } from '../types';

interface ArticleFormProps {
  onSubmit: (text: ExtractRequest) => void;
  isLoading: boolean;
}

export function ArticleForm({ onSubmit, isLoading }: ArticleFormProps) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setParseError(null);

    try {
      const parsedData = JSON.parse(text) as ExtractRequest;

      if (!parsedData.content?.trim()) {
        setParseError("Pasted JSON has to have field: 'content'.");
        return;
      }

      onSubmit(parsedData);
    } catch (err) {
      setParseError(`JSON parse error: ${(err as Error).message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the JSON here... {url: '...', title: '...', content: '...'}"
        className="w-full h-64 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-sans"
        disabled={isLoading}
      />

      {parseError && (
        <p className="text-red-500 text-sm font-semibold">{parseError}</p>
      )}

      <button
        type="submit"
        disabled={isLoading || text.trim().length === 0}
        className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isLoading ? 'Processing by AI...' : 'Analyze'}
      </button>
    </form>
  );
}