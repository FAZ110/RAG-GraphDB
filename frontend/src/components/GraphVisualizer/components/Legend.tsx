interface LegendProps {
  colorMap: Record<string, string>;
  selectedCategory?: string | null;
  onCategoryClick?: (category: string | null) => void;
}

export function Legend({ colorMap, selectedCategory, onCategoryClick }: LegendProps) {
  const entries = Object.entries(colorMap);
  if (entries.length === 0) return null;

  return (
    <div className="shrink-0 mt-3 pt-2 border-t border-gray-100">
      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
        {entries.map(([label, color]) => {
          const isSelected = selectedCategory === label;
          const isDimmed = selectedCategory && !isSelected;

          return (
            <button
              key={label}
              onClick={() => {
                if (onCategoryClick) {
                  onCategoryClick(isSelected ? null : label);
                }
              }}
              className={`
                flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white font-medium transition-all
                ${onCategoryClick ? 'cursor-pointer hover:brightness-110 hover:scale-105' : 'cursor-default'}
                ${isSelected ? 'ring-2 ring-offset-1 ring-gray-400 shadow-md' : ''}
              `}
              style={{
                backgroundColor: color,
                opacity: isDimmed ? 0.4 : 1
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}