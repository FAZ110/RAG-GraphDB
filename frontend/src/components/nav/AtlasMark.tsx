export function AtlasMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="5" r="1.8" fill="currentColor" />
      <circle cx="5" cy="18" r="1.8" fill="currentColor" />
      <circle cx="19" cy="18" r="1.8" fill="currentColor" />
      <path d="M11.3 6.4L5.7 16.6" />
      <path d="M12.7 6.4L18.3 16.6" />
      <path d="M6.6 18h10.8" />
    </svg>
  )
}
