import type { ArticleRequest } from '../types';
import { useFileUpload } from '../hooks/useFileUpload';
import { useFiles } from '../contexts/FileContext';

interface FileUploadFormProps {
  onSubmit: (data: { articles: ArticleRequest[] }) => void;
  disabled?: boolean;
  submitLabel?: string;
  large?: boolean;
}

export function FileUploadForm({
  onSubmit,
  disabled = false,
  submitLabel = 'Analizuj wszystko',
  large = false,
}: FileUploadFormProps) {
  const { files, removeFile, clearFiles } = useFiles();

  const {
    isDragging,
    error,
    inputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
  } = useFileUpload();

  const totalArticles = files.reduce((sum, f) => sum + f.articles.length, 0);

  const handleAnalyze = () => {
    const allArticles = files.flatMap((file) => file.articles);
    onSubmit({ articles: allArticles });
  };

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed cursor-pointer transition-all select-none overflow-hidden
          ${large ? 'gap-5 flex-1 min-h-[200px] p-8 rounded-3xl' : 'gap-1.5 flex-1 min-h-[120px] p-3 rounded-2xl'}
          ${isDragging
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.005] shadow-lg shadow-blue-200/40'
            : large
            ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-blue-400 hover:from-blue-50/40 hover:to-indigo-50/30 hover:shadow-md'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'}`}
      >
        {large && <div className="absolute inset-0 bg-dot-grid opacity-40 pointer-events-none" />}

        {large ? (
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="relative animate-float-slow">
              <div className="absolute -inset-3 bg-blue-200/30 blur-xl rounded-full" />
              <svg className="relative w-20 h-20 text-blue-500" fill="none" viewBox="0 0 80 80">
                <rect x="14" y="22" width="40" height="50" rx="3" fill="white" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                <rect x="20" y="16" width="40" height="50" rx="3" fill="white" stroke="currentColor" strokeWidth="2" opacity="0.75" />
                <rect x="26" y="10" width="40" height="50" rx="3" fill="white" stroke="currentColor" strokeWidth="2" />
                <path d="M34 22h24M34 30h24M34 38h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="64" cy="56" r="10" fill="white" stroke="currentColor" strokeWidth="2" />
                <path d="M64 51v10M59 56h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <p className="text-xl font-bold text-gray-900">
                {isDragging ? 'Upuść tutaj' : 'Przeciągnij artykuły lub kliknij'}
              </p>
              <p className="text-sm text-gray-500">Wgraj plik <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">.json</span> z jednym artykułem lub tablicą</p>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">{'{ url?, title?, content }'}</span>
              <span className="text-[11px] text-gray-400">lub</span>
              <span className="text-[11px] font-mono px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">{'[{...}, {...}]'}</span>
            </div>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-gray-600 font-medium text-center px-2">Upuść plik .json lub kliknij, aby wybrać</p>
            <p className="text-[10px] text-gray-400 text-center px-2">{'{ url?, title?, content }'} lub tablica</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md flex-shrink-0">
          <div className="flex flex-col">
            <span>Plików: <span className="font-semibold">{files.length}</span></span>
            <span>Artykułów: <span className="font-semibold">{totalArticles}</span></span>
          </div>
          <button
            onClick={clearFiles}
            type="button"
            className="px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
          >
            Wyczyść
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-[200px] flex-shrink-0 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex flex-col min-w-0">
                  <span className="text-green-800 font-medium truncate">{file.fileName}</span>
                  <span className="text-green-600 text-[10px]">{file.articles.length} art.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                title="Usuń plik"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={disabled || files.length === 0}
        className={`text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer flex-shrink-0 shadow-sm hover:shadow ${
          large ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm'
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
