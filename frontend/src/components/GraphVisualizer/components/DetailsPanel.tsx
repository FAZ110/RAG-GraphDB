export interface SelectedNode {
  id: string;
  label: string;
  category: string;
  degree: number;
  visibleDegree: number;
  expanded: boolean;
}

interface DetailsPanelProps {
  node: SelectedNode;
  isPending: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function DetailsPanel({ node, isPending, onToggleExpand, onClose }: DetailsPanelProps) {
  const hidden = Math.max(node.degree - node.visibleDegree, 0);

  return (
    <div className="absolute top-2 right-2 z-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Węzeł</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
          {node.category}
        </span>
        <p className="text-sm font-semibold text-gray-900 wrap-break-word">{node.label}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
            <div className="font-semibold text-gray-900 text-sm">{node.degree}</div>
            <div>sąsiadów</div>
          </div>
          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
            <div className="font-semibold text-gray-900 text-sm">{node.visibleDegree}</div>
            <div>widocznych</div>
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          disabled={isPending}
          className="w-full mt-2 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {isPending ? 'Wczytuję...' : node.expanded ? 'Zwiń' : 'Rozwiń'}
        </button>

        {hidden > 0 && (
          <p className="text-xs text-gray-500 text-center">
            {node.expanded
              ? `${hidden} powiązań poza limitem rozwinięcia`
              : `${hidden} ukrytych powiązań`}
          </p>
        )}
      </div>
    </div>
  );
}
