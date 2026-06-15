interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm flex items-start gap-2">
      <span className="text-lg leading-none">⚠️</span>
      <div className="min-w-0">
        <p className="font-bold text-sm">Wystąpił błąd</p>
        <p className="text-xs break-words">{message}</p>
      </div>
    </div>
  );
}