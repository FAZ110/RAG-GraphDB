interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm flex items-center gap-3">
      <span className="text-xl">⚠️</span>
      <div>
        <p className="font-bold">Error occured</p>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}