interface ListSkeletonProps {
  count?: number;
  /** "card" shows rounded card skeletons, "row" shows table-row style */
  variant?: "card" | "row";
}

export function ListSkeleton({ count = 6, variant = "card" }: ListSkeletonProps) {
  if (variant === "row") {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-card border border-border animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
            <div className="h-5 bg-muted rounded-full w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
