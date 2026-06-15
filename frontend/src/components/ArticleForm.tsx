import { useState } from 'react';
import type { ArticleRequest } from '../types';

interface ArticleFormProps {
  onSubmit: (data: { articles: ArticleRequest[] }) => void;
  disabled?: boolean;
  submitLabel?: string;
  large?: boolean;
}

export function ArticleForm({
  onSubmit,
  disabled = false,
  submitLabel = 'Analizuj',
  large = false,
}: ArticleFormProps) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setParseError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setParseError(`Błąd parsowania JSON: ${(err as Error).message}`);
      return;
    }

    const articles: ArticleRequest[] = Array.isArray(parsed) ? parsed : [parsed as ArticleRequest];

    const invalid = articles.find((a) => !a.content?.trim());
    if (invalid !== undefined) {
      setParseError("Każdy artykuł musi zawierać pole: 'content'.");
      return;
    }

    onSubmit({ articles });
  };

  if (large) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-h-0 rounded-2xl border-2 border-gray-200 bg-gray-50/60 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-100/50 transition-all overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white/70 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="ml-2 text-xs font-mono text-gray-500">article.json</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider font-bold text-blue-500/70 bg-blue-50 px-1.5 py-0.5 rounded">
              JSON
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`// Wklej jeden artykuł lub tablicę\n[\n  {\n    "title": "Tytuł artykułu",\n    "content": "Treść..."\n  }\n]`}
            className="w-full flex-1 min-h-[160px] p-4 text-sm font-mono bg-transparent resize-none focus:outline-none placeholder:text-gray-400 placeholder:italic text-gray-800 leading-relaxed"
            disabled={disabled}
            spellCheck={false}
          />
        </div>

        {parseError && (
          <p className="text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-lg flex-shrink-0">
            {parseError}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="px-6 py-3.5 text-base text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer shadow-sm hover:shadow flex-shrink-0"
        >
          {submitLabel}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0 rounded-xl border-2 border-gray-200 bg-gray-50/60 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-md focus-within:shadow-blue-100/50 transition-all overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-200 bg-white/70 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-green-400" />
          </div>
          <span className="ml-1.5 text-[11px] font-mono text-gray-500">article.json</span>
          <span className="ml-auto text-[9px] uppercase tracking-wider font-bold text-blue-500/70 bg-blue-50 px-1.5 py-0.5 rounded">
            JSON
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`// Wklej jeden artykuł lub tablicę\n[\n  {\n    "title": "...",\n    "content": "..."\n  }\n]`}
          className="w-full flex-1 min-h-[140px] p-3 text-xs font-mono bg-transparent resize-none focus:outline-none placeholder:text-gray-400 placeholder:italic text-gray-800 leading-relaxed"
          disabled={disabled}
          spellCheck={false}
        />
      </div>

      {parseError && (
        <p className="text-red-600 text-xs font-semibold bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg flex-shrink-0">
          {parseError}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        className="px-4 py-2.5 text-sm text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer shadow-sm hover:shadow flex-shrink-0"
      >
        {submitLabel}
      </button>
    </form>
  );
}
