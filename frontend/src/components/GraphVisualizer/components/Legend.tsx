interface LegendProps {
  colorMap: Record<string, string>;
  selectedCategory?: string | null;
  onCategoryClick?: (category: string | null) => void;
}

export function Legend({ colorMap, selectedCategory, onCategoryClick }: LegendProps) {
  const entries = Object.entries(colorMap);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
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
              flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full text-white font-medium transition-all
              ${onCategoryClick ? 'cursor-pointer hover:brightness-110 hover:scale-105' : 'cursor-default'}
              ${isSelected ? 'ring-2 ring-offset-2 ring-gray-400 shadow-md' : ''}
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
  );
}