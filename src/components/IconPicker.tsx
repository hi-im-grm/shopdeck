import { useState } from "react";
import { ICON_LIST, iconByName } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag as TagIcon, X } from "lucide-react";

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
};

/** Compact icon button + popover grid for choosing an icon from ICON_REGISTRY. */
export function IconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const Current = iconByName(value);
  const filtered = query
    ? ICON_LIST.filter(
        (i) =>
          i.label.toLowerCase().includes(query.toLowerCase()) ||
          i.name.toLowerCase().includes(query.toLowerCase()),
      )
    : ICON_LIST;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title={value ?? "Wybierz ikonę"}
        >
          {Current ? (
            <Current className="h-4 w-4" />
          ) : (
            <TagIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-2" align="start">
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj ikony…"
          className="mb-2 h-8"
        />
        <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="aspect-square flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
              title="Usuń ikonę"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {filtered.map(({ name, label, icon: Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`aspect-square flex items-center justify-center rounded hover:bg-muted transition-colors ${
                value === name ? "bg-primary text-primary-foreground" : ""
              }`}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-6 text-center text-xs text-muted-foreground py-4">
              Nic nie pasuje.
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
