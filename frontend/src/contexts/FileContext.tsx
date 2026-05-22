/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ArticleRequest, UploadedFile } from '../types';

interface FileContextType {
  files: UploadedFile[];
  addFile: (fileName: string, articles: ArticleRequest[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
}

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFile = (fileName: string, articles: ArticleRequest[]) => {
    const newFile: UploadedFile = {
      id: crypto.randomUUID(),
      fileName,
      articles,
    };
    setFiles((prev) => [...prev, newFile]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  return (
    <FileContext.Provider value={{ files, addFile, removeFile, clearFiles }}>
      {children}
    </FileContext.Provider>
  );
}

