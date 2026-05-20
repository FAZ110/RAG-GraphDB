import { useRef, useState } from 'react';
import type { ArticleRequest } from '../types';
import { parseArticleFile } from '../utils/parseArticleFile';

interface FileUploadState {
  isDragging: boolean;
  fileName: string | null;
  articles: ArticleRequest[] | null;
  error: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    isDragging: false,
    fileName: null,
    articles: null,
    error: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setState((s) => ({ ...s, fileName: null, articles: null, error: null }));

    parseArticleFile(file)
      .then((articles) => setState((s) => ({ ...s, articles, fileName: file.name })))
      .catch((err: Error) => setState((s) => ({ ...s, error: err.message })));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setState((s) => ({ ...s, isDragging: false }));
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setState((s) => ({ ...s, isDragging: true }));
  };

  const handleDragLeave = () => {
    setState((s) => ({ ...s, isDragging: false }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return {
    ...state,
    inputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
  };
}
