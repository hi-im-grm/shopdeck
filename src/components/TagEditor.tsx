import { useState, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  presets?: readonly string[];
  placeholder?: string;
};

/** Chip-based tag editor. Suggest from `presets`, accept free-form input. */
export function TagEditor({ value, onChange, presets = [], placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function addTag(t: string) {
    const clean = t.trim();
    if (!clean) return;
    if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setDraft("");
  }

  function removeTag(t: string) {
    onChange(value.filter((v) => v !== t));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const availablePresets = presets.filter(
    (p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pl-2 pr-1">
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="hover:bg-background/40 rounded p-0.5"
                aria-label={`Usuń tag ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder ?? "Dodaj tag i naciśnij Enter"}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => addTag(draft)}
          disabled={!draft.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground self-center mr-1">
            Sugestie:
          </span>
          {availablePresets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => addTag(p)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              + {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
