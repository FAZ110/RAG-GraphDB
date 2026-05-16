import type { ArticleResult } from "../types";

interface ResultDisplayProps {
  results: ArticleResult[];
}

export function ResultDisplay({ results }: ResultDisplayProps) {
  return (
    <div className="mt-8 flex flex-col gap-4">
      {results.map((result, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border shadow-sm ${
            result.status === "ok"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 truncate pr-4">
              {`Article ${index + 1} -  ${result.title}`}
            </h3>
            <span
              className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                result.status === "ok"
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {result.status}
            </span>
          </div>

          {result.error && (
            <p className="text-red-600 text-sm">{result.error}</p>
          )}

          {result.executed_code && (
            <pre className="bg-slate-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm font-mono shadow-inner">
              <code>{result.executed_code}</code>
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
