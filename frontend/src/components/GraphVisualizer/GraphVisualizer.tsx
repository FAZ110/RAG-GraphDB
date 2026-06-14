import type { GraphResponse } from '../../types';
import { useGraphVisualization } from './hooks/useGraphVisualization';
import { DetailsPanel } from './components/DetailsPanel';
import { Legend } from './components/Legend';

interface Props extends GraphResponse {
  highlightedNames?: string[];
  focusedName?: string | null;
}

export function GraphVisualizer({ nodes, edges, highlightedNames, focusedName }: Props) {
  const { containerRef, wrapperRef, selected, setSelected, colorMap, selectedCategory, toggleCategory, isFullscreen, toggleFullscreen } = useGraphVisualization(nodes, edges, highlightedNames, focusedName);

  return (
    <div ref={wrapperRef} className={`flex flex-col h-full ${isFullscreen ? 'bg-white p-4' : ''}`}>
      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          className={`w-full border border-gray-200 rounded-lg bg-gray-50 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-full'}`}
        />
        {selected && (
          <DetailsPanel element={selected} onClose={() => setSelected(null)} />
        )}

        <button
          onClick={toggleFullscreen}
          className='absolute bottom-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600'
          title={isFullscreen ? 'wyjdź z pełnego ekranu' : 'pełny ekran'}
        >
          {isFullscreen ? '✕ Wyjdź' : '⛶ Pełny ekran'}
        </button>
      </div>
      <Legend
        colorMap={colorMap}
        selectedCategory={selectedCategory}
        onCategoryClick={toggleCategory}
      />
    </div>
  );
}