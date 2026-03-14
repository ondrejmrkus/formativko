import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      {items.length > 1 && items[items.length - 2].href && (
        <Link
          to={items[items.length - 2].href!}
          className="flex items-center gap-1 px-2 py-1.5 -ml-2 rounded-lg hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm font-medium">{items[items.length - 2].label}</span>
        </Link>
      )}
    </nav>
  );
}
