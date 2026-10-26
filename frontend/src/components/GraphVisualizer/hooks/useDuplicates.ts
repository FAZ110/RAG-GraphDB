import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storedValue } from '@/lib/storedValue';
import { SPACES_QUERY_KEY } from '../../../hooks/useSpaces';
import { fetchDuplicates } from '../../../services/api';

// Suggestions the user has already been shown, so the modal opens by itself only for new ones.
const KEEP = 1000;
const seenSuggestions = storedValue<string[]>('atlas:seen-duplicates', [], {
  parse: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  },
  format: (ids) => JSON.stringify(ids),
});

// Under the space's key, so every graph edit (which invalidates it) refreshes the list.
export const duplicatesKey = (spaceId: string) => [...SPACES_QUERY_KEY, spaceId, 'duplicates'];

/** The space's suggested duplicates; the modal is open while some haven't been shown yet. */
export function useDuplicates(spaceId: string) {
  const { data = [] } = useQuery({
    queryKey: duplicatesKey(spaceId),
    queryFn: () => fetchDuplicates(spaceId),
  });
  const seen = seenSuggestions.useValue();
  const [opened, setOpened] = useState(false);

  const setOpen = (next: boolean) => {
    if (!next) {
      const fresh = data.map((s) => s.id).filter((id) => !seen.includes(id));
      if (fresh.length > 0) seenSuggestions.set([...seen, ...fresh].slice(-KEEP));
    }
    setOpened(next);
  };

  return {
    suggestions: data,
    open: opened || data.some((s) => !seen.includes(s.id)),
    setOpen,
  };
}
