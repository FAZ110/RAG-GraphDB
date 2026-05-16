import { useState } from 'react';
import type { BulkExtractRequest, ArticleRequest } from '../types';

interface ArticleFormProps {
  onSubmit: (data: BulkExtractRequest) => void;
  isLoading: boolean;
}

export function ArticleForm({ onSubmit, isLoading }: ArticleFormProps) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setParseError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setParseError(`JSON parse error: ${(err as Error).message}`);
      return;
    }

    const articles: ArticleRequest[] = Array.isArray(parsed) ? parsed : [parsed as ArticleRequest];

    const invalid = articles.find((a) => !a.content?.trim());
    if (invalid !== undefined) {
      setParseError("Every article has to have field: 'content'.");
      return;
    }

    onSubmit({ articles });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Paste JSON - one article or array:\n[{ "title": "...", "content": "..." }, ...]`}
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
