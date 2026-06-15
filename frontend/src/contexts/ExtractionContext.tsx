/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useExtractGraph } from '../hooks/useExtractGraph';

type ExtractionValue = ReturnType<typeof useExtractGraph>;

const ExtractionContext = createContext<ExtractionValue | undefined>(undefined);

export function useExtraction(): ExtractionValue {
  const ctx = useContext(ExtractionContext);
  if (!ctx) {
    throw new Error('useExtraction must be used within an ExtractionProvider');
  }
  return ctx;
}

export function ExtractionProvider({ children }: { children: ReactNode }) {
  const value = useExtractGraph();
  return <ExtractionContext.Provider value={value}>{children}</ExtractionContext.Provider>;
}
