interface ResultDisplayProps {
  status: string;
  cypherCode?: string;
}

export function ResultDisplay({ status, cypherCode }: ResultDisplayProps) {
  return (
    <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
      <h3 className="text-xl font-bold text-green-800 mb-4">{status}</h3>
      
      {cypherCode && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Generated Cypher code:
          </span>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm font-mono shadow-inner">
            <code>{cypherCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
}