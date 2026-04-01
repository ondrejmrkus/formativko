import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LinkEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  emptyMessage: string;
  items: any[];
  onSelect: (id: string) => void;
  renderItem?: (item: any) => React.ReactNode;
}

export function LinkEntityDialog({
  open,
  onOpenChange,
  title,
  emptyMessage,
  items,
  onSelect,
  renderItem,
}: LinkEntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onOpenChange(false); }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
              >
                {renderItem ? renderItem(item) : (
                  <>
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                    {item.subjects?.name && (
                      <Badge variant="outline" className="text-[10px] mt-1">{item.subjects.name}</Badge>
                    )}
                  </>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
