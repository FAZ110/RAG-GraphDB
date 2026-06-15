import { useCallback, useEffect, useRef, useState } from "react";
import { submitExtract, createExtractStream } from "../services/api";
import type { ArticleRequest, ArticleResult } from "../types";

type ExtractionStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

interface ExtractionRequest {
  articles: ArticleRequest[];
  provider: string;
}

interface ExtractionState {
  status: ExtractionStatus;
  results: ArticleResult[];
  total: number;
  processedCount: number;
  error: string | null;
}

const initialState: ExtractionState = {
  status: 'idle',
  results: [],
  total: 0,
  processedCount: 0,
  error: null,
};

export function useExtractGraph() {
  const [state, setState] = useState<ExtractionState>(initialState);

  const statusRef = useRef<ExtractionStatus>('idle');
  const queueRef = useRef<{ articles: ArticleRequest[]; provider: string; index: number } | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const inFlightRef = useRef(false);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const setStatus = useCallback((status: ExtractionStatus) => {
    statusRef.current = status;
    setState((s) => ({ ...s, status }));
  }, []);

  const processNext = useCallback(async () => {
    if (statusRef.current !== 'running') return;
    const q = queueRef.current;
    if (!q) return;

    if (q.index >= q.articles.length) {
      setStatus('done');
      return;
    }

    const article = q.articles[q.index];
    inFlightRef.current = true;

    let jobId: string;
    try {
      const response = await submitExtract({ articles: [article], provider: q.provider });
      jobId = response.job_id;
    } catch (err) {
      inFlightRef.current = false;
      statusRef.current = 'error';
      setState((s) => ({ ...s, status: 'error', error: (err as Error).message }));
      return;
    }

    if (statusRef.current !== 'running' && statusRef.current !== 'paused') {
      inFlightRef.current = false;
      return;
    }

    const es = createExtractStream(jobId);
    esRef.current = es;

    es.addEventListener('result', (e: MessageEvent) => {
      const result = JSON.parse(e.data) as ArticleResult;
      setState((s) => ({ ...s, results: [...s.results, result] }));
    });

    es.addEventListener('done', () => {
      closeStream();
      inFlightRef.current = false;
      if (queueRef.current) {
        queueRef.current.index += 1;
      }
      setState((s) => ({ ...s, processedCount: s.processedCount + 1 }));
      if (statusRef.current === 'running') {
        processNext();
      }
    });

    es.addEventListener('error', (e: Event) => {
      closeStream();
      inFlightRef.current = false;
      const data = (e as MessageEvent).data;
      const payload = (() => {
        try {
          return JSON.parse(data ?? '{}');
        } catch {
          return {};
        }
      })();
      statusRef.current = 'error';
      setState((s) => ({ ...s, status: 'error', error: payload.error ?? 'Błąd strumieniowania' }));
    });

    es.onerror = () => {
      if (statusRef.current === 'done' || statusRef.current === 'idle' || statusRef.current === 'error') return;
      closeStream();
      inFlightRef.current = false;
      statusRef.current = 'error';
      setState((s) => ({ ...s, status: 'error', error: 'Utracono połączenie ze strumieniem' }));
    };
  }, [closeStream, setStatus]);

  const start = useCallback(
    (data: ExtractionRequest) => {
      if (data.articles.length === 0) return;
      closeStream();
      queueRef.current = { articles: data.articles, provider: data.provider, index: 0 };
      inFlightRef.current = false;
      statusRef.current = 'running';
      setState({
        status: 'running',
        results: [],
        total: data.articles.length,
        processedCount: 0,
        error: null,
      });
      processNext();
    },
    [closeStream, processNext],
  );

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    setStatus('paused');
  }, [setStatus]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    statusRef.current = 'running';
    setState((s) => ({ ...s, status: 'running' }));
    if (!inFlightRef.current) {
      processNext();
    }
  }, [processNext]);

  const stop = useCallback(() => {
    closeStream();
    inFlightRef.current = false;
    queueRef.current = null;
    statusRef.current = 'idle';
    setState((s) => ({ ...s, status: 'idle' }));
  }, [closeStream]);

  const reset = useCallback(() => {
    closeStream();
    inFlightRef.current = false;
    queueRef.current = null;
    statusRef.current = 'idle';
    setState(initialState);
  }, [closeStream]);

  useEffect(() => () => closeStream(), [closeStream]);

  return {
    status: state.status,
    results: state.results,
    total: state.total,
    processedCount: state.processedCount,
    error: state.error,
    isRunning: state.status === 'running',
    isPaused: state.status === 'paused',
    isActive: state.status === 'running' || state.status === 'paused',
    isDone: state.status === 'done',
    isError: state.status === 'error',
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
