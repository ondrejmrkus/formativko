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
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      {items.length > 1 && items[items.length - 2].href && (
        <Link to={items[items.length - 2].href!} className="mr-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="mx-1">→</span>}
          {item.href && index < items.length - 1 ? (
            <Link to={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "text-foreground font-medium" : ""}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
