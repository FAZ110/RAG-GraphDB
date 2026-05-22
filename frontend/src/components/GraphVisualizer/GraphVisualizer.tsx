import type { GraphResponse } from '../../types';
import { useGraphVisualization } from './useGraphVisualization';
import { DetailsPanel } from './DetailsPanel';
import { Legend } from './Legend';

export function GraphVisualizer({ nodes, edges }: GraphResponse) {
  const { containerRef, selected, setSelected, colorMap, selectedCategory, toggleCategory } = useGraphVisualization(nodes, edges);

  return (
    <div>
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[600px] border border-gray-200 rounded-lg bg-gray-50"
        />
        {selected && (
          <DetailsPanel element={selected} onClose={() => setSelected(null)} />
        )}
      </div>
      <Legend
        colorMap={colorMap}
        selectedCategory={selectedCategory}
        onCategoryClick={toggleCategory}
      />
    </div>
  );
}