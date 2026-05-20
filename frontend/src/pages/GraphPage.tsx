import { useGraphQuery } from "../hooks/useGraphQuery";
import { GraphVisualizer } from "../components/GraphVisualizer";

export function GraphPage() {
  const { data, isLoading, isError, error, refetch } = useGraphQuery();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Graph Display
        </h1>
        <p className="mt-3 text-xl text-gray-600">Explore your graph</p>
      </div>

      <div className="bg-white p-6 shadow-xl rounded-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">
            {data && `${data.nodes.length} nodes, ${data.edges.length} edges`}
          </span>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <p className="text-center text-gray-500 py-16">Loading graph...</p>
        )}

        {isError && (
          <p className="text-center text-red-500 py-16">{error.message}</p>
        )}

        {data && (
          <GraphVisualizer nodes={data.nodes} edges={data.edges} />
        )}
      </div>
    </div>
  );
}