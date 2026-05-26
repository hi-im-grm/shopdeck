import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Package,
  ListTodo,
  StickyNote,
  Store,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customers", label: "Klienci", icon: Users },
  { to: "/products", label: "Produkty", icon: Package },
  { to: "/templates", label: "Szablony ofert", icon: Layers },
  { to: "/todos", label: "Todo", icon: ListTodo },
  { to: "/notes", label: "Notatki", icon: StickyNote },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b">
        <Store className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">shopdeck</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t space-y-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}

