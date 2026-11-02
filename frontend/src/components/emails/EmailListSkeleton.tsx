export function EmailListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading emails">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex animate-pulse items-center gap-4 border-b border-line px-6 py-4">
          <div className="h-3 w-40 rounded bg-surface" />
          <div className="h-5 w-28 rounded-md bg-surface" />
          <div className="h-3 flex-1 rounded bg-surface" />
        </li>
      ))}
    </ul>
  );
}