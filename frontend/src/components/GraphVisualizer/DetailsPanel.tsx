import type { SelectedElement } from './useGraphVisualization';

interface DetailsPanelProps {
  element: SelectedElement;
  onClose: () => void;
}

export function DetailsPanel({ element, onClose }: DetailsPanelProps) {
  return (
    <div className="absolute top-2 right-2 z-10 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {element.type === 'node' ? 'Węzeł' : 'Relacja'}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      {element.type === 'node' && (
        <div className="space-y-2">
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {element.data.category}
          </span>
          <p className="text-sm font-semibold text-gray-900 wrap-break-word">{element.data.label}</p>
        </div>
      )}

      {element.type === 'edge' && (
        <div className="space-y-2">
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {element.data.label}
          </span>
          <p className="text-sm text-gray-700 wrap-break-word">
            <span className="font-medium">{element.data.sourceName}</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-medium">{element.data.targetName}</span>
          </p>
        </div>
      )}
    </div>
  );
}