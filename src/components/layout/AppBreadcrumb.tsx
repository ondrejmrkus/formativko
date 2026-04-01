import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  const navigate = useNavigate();

  if (items.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 px-2 py-1.5 -ml-2 rounded-lg hover:bg-accent hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Zpět</span>
      </button>
    </nav>
  );
}
