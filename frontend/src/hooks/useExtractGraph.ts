import { useCallback, useEffect, useRef, useState } from "react";
import { submitExtract, createExtractStream } from "../services/api";
import type { BulkExtractRequest, ArticleResult } from "../types";

type ExtractionStatus = 'idle' | 'submitting' | 'streaming' | 'done' | 'error';

interface ExtractionState {
  status: ExtractionStatus;
  results: ArticleResult[];
  total: number;
  error: string | null;
}

export function useExtractGraph() {
  const [state, setState] = useState<ExtractionState>({
    status: 'idle', results: [], total: 0, error: null,
  })

  const esRef = useRef<EventSource| null>(null);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, [])

  const mutate = useCallback(async (data: BulkExtractRequest) => {
    closeStream();
    setState({status: 'submitting', results: [], total: 0, error: null});

    let jobId: string;

    try {
      const response = await submitExtract(data);
      jobId = response.job_id;
    } catch (error) {
      setState(s => ({...s, status: 'error', error: (error as Error). message}));
      return
    }

    const es = createExtractStream(jobId);
    esRef.current = es;

    es.addEventListener('start', (e: MessageEvent) => {
      const { total } = JSON.parse(e.data) as {total: number};
      setState(s => ({...s, status: 'streaming', total}))
    });

    es.addEventListener('result', (e: MessageEvent) => {
      const result = JSON.parse(e.data) as ArticleResult;
      setState(s => ({ ...s, results: [...s.results, result] }));
    })

    es.addEventListener('done', () => {
      closeStream();
      setState(s => ({ ...s, status: 'done' }));
    });

    es.addEventListener('error', (e: Event) => {
      const data = (e as MessageEvent).data;
      const payload = (() => { try { return JSON.parse(data ?? '{}'); } catch { return {}; } })();
      setState(s => ({ ...s, status: 'error', error: payload.error ?? 'Streaming error' }));
      closeStream();
    });

    es.onerror = () => {
      setState(s => s.status === 'done' ? s : { ...s, status: 'error', error: 'Connection lost' });
      closeStream();
    };

  }, [closeStream]);

  useEffect(() => () => closeStream(), [closeStream]);

  const isPending = state.status === 'submitting' || state.status === 'streaming';
  const isError = state.status === 'error';
  const isSuccess = state.status === 'done';

  return {
    mutate,
    isPending,
    isError,
    isSuccess,
    error: state.error ? new Error(state.error) : null,
    data: (isSuccess || state.status === 'streaming') ? {results: state.results} : null,
    status: state.status,
    results: state.results,
    total: state.total ,
  }
}
 