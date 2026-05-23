import { useState } from 'react';
import type { GraphResponse } from '../../types';
import { useGraphVisualization } from './hooks/useGraphVisualization';
import { DetailsPanel } from './components/DetailsPanel';
import { Legend } from './components/Legend';
import { GraphStatsPanel } from './components/GraphStatsPanel';

export function GraphVisualizer({ nodes, edges }: GraphResponse) {
  const { containerRef, wrapperRef, selected, setSelected, colorMap, selectedCategory, toggleCategory, isFullscreen, toggleFullscreen } = useGraphVisualization(nodes, edges);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div ref={wrapperRef} className={isFullscreen ? 'bg-white p-4 flex flex-col': ''}>
      <div className="relative">
        <div
          ref={containerRef}
          className={`w-full border border-gray-200 rounded-lg bg-gray-50 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-150'}`}
        />
        {selected && (
          <DetailsPanel element={selected} onClose={() => setSelected(null)} />
        )}

        <button
          onClick={toggleFullscreen}
          className='absolute bottom-2 right-2 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600'
          title={isFullscreen ? 'exit fullscreen' : 'fullscreen'}
        >
          {isFullscreen ? '✕ Exit' : '⛶ Fullscreen'}
        </button>

        <button
          onClick={() => setIsOpen(true)}
          className='absolute bottom-2 left-2 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-600 text-sm'
        >
          Statistics
        </button>

        <GraphStatsPanel nodes={nodes} edges={edges} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
      <Legend
        colorMap={colorMap}
        selectedCategory={selectedCategory}
        onCategoryClick={toggleCategory}
      />
    </div>
  );
}