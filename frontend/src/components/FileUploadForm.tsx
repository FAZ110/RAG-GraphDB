import type { BulkExtractRequest } from '../types';
import { useFileUpload } from '../hooks/useFileUpload';

interface FileUploadFormProps {
  onSubmit: (data: BulkExtractRequest) => void;
  isLoading: boolean;
}

export function FileUploadForm({ onSubmit, isLoading }: FileUploadFormProps) {
  const {
    isDragging,
    fileName,
    articles,
    error,
    inputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
  } = useFileUpload();

  return (
    <div className="flex flex-col gap-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors select-none
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`}
      >
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-600 font-medium">Drop .json file here or click to select</p>
        <p className="text-xs text-gray-400">{'{ url?, title?, content }'}  or an array of articles</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

      {articles && fileName && (
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-800 font-medium">{fileName}</span>
          <span className="text-green-600">— {articles.length} article{articles.length !== 1 ? 's' : ''} ready</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => articles && onSubmit({ articles })}
        disabled={isLoading || !articles}
        className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isLoading ? 'Processing by AI...' : 'Analyze'}
      </button>
    </div>
  );
}
