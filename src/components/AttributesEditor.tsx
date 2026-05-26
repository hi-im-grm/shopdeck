import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { ProductAttribute } from "@/lib/db";
import { IconPicker } from "@/components/IconPicker";

type Props = {
  value: ProductAttribute[];
  onChange: (next: ProductAttribute[]) => void;
};

/** Key-value-icon editor — used for products.attributes_json. */
export function AttributesEditor({ value, onChange }: Props) {
  function update(i: number, patch: Partial<ProductAttribute>) {
    onChange(value.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { key: "", value: "", icon: null }]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Brak. Dodaj parę klucz/wartość — np. „Akcesoria w komplecie” / „Pilot 2 szt”.
          Możesz też przypiąć ikonkę.
        </p>
      )}
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <IconPicker
            value={row.icon}
            onChange={(icon) => update(i, { icon })}
          />
          <Input
            value={row.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="Nazwa (np. Szerokość)"
            className="flex-1"
          />
          <Input
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Wartość"
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Dodaj atrybut
      </Button>
    </div>
  );
}
