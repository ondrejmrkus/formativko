import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X, Loader2 } from "lucide-react";

interface AiSuggestionCardsProps<T> {
  items: T[];
  label: string;
  savingIdx: number | null;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  renderItem: (item: T) => ReactNode;
}

export function AiSuggestionCards<T>({
  items,
  label,
  savingIdx,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  renderItem,
}: AiSuggestionCardsProps<T>) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {label} ({items.length})
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-7"
            onClick={onAcceptAll}
          >
            <Check className="h-3 w-3" />
            Přijmout vše
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs h-7 text-muted-foreground"
            onClick={onRejectAll}
          >
            <X className="h-3 w-3" />
            Odmítnout vše
          </Button>
        </div>
      </div>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="p-3 rounded-xl bg-primary/5 border border-primary/20 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {renderItem(item)}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onAccept(idx)}
                disabled={savingIdx === idx}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                title="Přijmout"
              >
                {savingIdx === idx ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => onReject(idx)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground transition-colors"
                title="Odmítnout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface AiShimmerProps {
  count: number;
}

export function AiShimmer({ count }: AiShimmerProps) {
  return (
    <div className="mb-4 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden">
          <div className="space-y-2">
            <div
              className="h-4 w-3/4 rounded animate-field-shimmer"
              style={{
                animationDelay: `${i * 200}ms`,
                background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--primary) / 0.15) 40%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.15) 60%, hsl(var(--muted)) 100%)",
                backgroundSize: "200% 100%",
              }}
            />
            <div
              className="h-3 w-1/2 rounded animate-field-shimmer"
              style={{
                animationDelay: `${i * 200 + 100}ms`,
                background: "linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--primary) / 0.1) 40%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.1) 60%, hsl(var(--muted)) 100%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
