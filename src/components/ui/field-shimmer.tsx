/**
 * Wraps an input/textarea and overlays a shimmer animation while AI is generating.
 * The shimmer uses the app's primary color for a cohesive look.
 */
export function ShimmerField({
  shimmer,
  lines = 1,
  children,
  className = "",
}: {
  /** Whether to show the shimmer overlay */
  shimmer: boolean;
  /** Number of shimmer lines (use 2+ for textareas) */
  lines?: number;
  children: React.ReactNode;
  className?: string;
}) {
  if (!shimmer) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-40">{children}</div>
      <div className="pointer-events-none absolute inset-[1px] overflow-hidden rounded-[calc(var(--radius)-1px)] flex flex-col justify-center gap-2 px-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2 rounded-full animate-field-shimmer"
            style={{
              width: i === lines - 1 && lines > 1 ? "50%" : `${88 - i * 10}%`,
              animationDelay: `${i * 150}ms`,
              background:
                "linear-gradient(90deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.22) 45%, hsl(var(--primary) / 0.08) 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
    </div>
  );
}
