import { useRef, useState } from 'react';
import { parseArticleFile } from '../utils/parseArticleFile';
import { useFiles } from '../contexts/FileContext'; 

interface FileUploadState {
  isDragging: boolean;
  error: string | null;
}

export function useFileUpload() {
  const { addFile } = useFiles();
  
  const [state, setState] = useState<FileUploadState>({
    isDragging: false,
    error: null,
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setState((s) => ({ ...s, error: null }));

    parseArticleFile(file)
      .then((articles) => {
        addFile(file.name, articles); 
      })
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