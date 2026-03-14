import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface E03CaptureToolSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function E03CaptureToolSettings({ open, onClose }: E03CaptureToolSettingsProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-lg w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-accent rounded-lg"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>

        <h2 className="text-lg font-semibold mb-8 text-foreground">Nastavení</h2>

        <Button asChild variant="destructive" className="w-full" size="lg">
          <Link to="/">Ukončit lekci</Link>
        </Button>
      </div>
    </div>
  );
}
