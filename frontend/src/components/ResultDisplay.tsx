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
              {`Article ${index + 1}${result.title ? ` - ${result.title}` : ''}`}
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

          {result.status === "ok" && (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-gray-600">
                Extracted: <span className="font-semibold">{result.nodes_count} nodes</span>,{" "}
                <span className="font-semibold">{result.edges_count} edges</span>
              </p>
              {result.nodes && result.nodes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Nodes</p>
                  <div className="flex flex-wrap gap-2">
                    {result.nodes.map((n, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {n.label}: {n.properties.name as string}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.edges && result.edges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Edges</p>
                  <div className="flex flex-col gap-1">
                    {(() => {
                      const idToName = Object.fromEntries(
                        (result.nodes ?? []).map((n) => [n.id, n.properties.name as string])
                      );
                      return result.edges.map((e, i) => (
                        <span key={i} className="text-xs text-gray-600 font-mono">
                          {idToName[e.source] ?? e.source} —[{e.type}]→ {idToName[e.target] ?? e.target}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
