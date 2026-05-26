import { useEffect, useState } from "react";
import {
  fetchAuditLog,
  type AuditEntityType,
  type AuditEntry,
  FIELD_LABELS_PL,
} from "@/lib/audit";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Plus, Pencil, Trash2 } from "lucide-react";

type Props = {
  entityType: AuditEntityType;
  entityId: number;
};

function formatDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fieldLabel(field: string): string {
  return FIELD_LABELS_PL[field] ?? field;
}

/** Compact representation of a single value for the diff view. */
function formatValue(v: unknown): string {
  if (v == null) return "(puste)";
  if (typeof v === "boolean") return v ? "tak" : "nie";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    // Truncate long blobs (image data URLs, big JSON) to keep rows scannable.
    if (v.length > 80) return v.slice(0, 80) + "…";
    return v || "(puste)";
  }
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 80) + "…" : s;
  } catch {
    return String(v);
  }
}

export function AuditHistory({ entityType, entityId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    fetchAuditLog(entityType, entityId).then(setEntries);
  }, [entityType, entityId]);

  if (entries === null) {
    return (
      <div className="text-sm text-muted-foreground p-3">Ładowanie historii…</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
        Brak zmian zarejestrowanych w historii.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => {
        const Icon =
          e.action === "create" ? Plus : e.action === "delete" ? Trash2 : Pencil;
        const actionLabel =
          e.action === "create"
            ? "utworzono"
            : e.action === "delete"
              ? "usunięto"
              : "edytowano";
        const actionColor =
          e.action === "create"
            ? "text-emerald-600 dark:text-emerald-400"
            : e.action === "delete"
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400";

        let changedFields: Record<string, { old: unknown; new: unknown }> = {};
        try {
          if (e.changed_fields) changedFields = JSON.parse(e.changed_fields);
        } catch {
          /* ignore */
        }
        let snapshot: Record<string, unknown> | null = null;
        try {
          if (e.snapshot_json) snapshot = JSON.parse(e.snapshot_json);
        } catch {
          /* ignore */
        }

        return (
          <Card key={e.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${actionColor}`} />
                  <span className={`font-medium ${actionColor}`}>
                    {actionLabel}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDateTime(e.changed_at)}
                </span>
              </div>

              {e.action === "create" && (
                <div className="text-xs text-muted-foreground">
                  Wpis utworzony{Object.keys(changedFields).length
                    ? ` z polami: ${Object.keys(changedFields)
                        .map(fieldLabel)
                        .join(", ")}`
                    : ""}
                  .
                </div>
              )}

              {e.action === "update" && Object.keys(changedFields).length > 0 && (
                <div className="space-y-1 text-xs">
                  {Object.entries(changedFields).map(([field, change]) => (
                    <div
                      key={field}
                      className="flex items-start gap-2 flex-wrap"
                    >
                      <Badge variant="outline" className="text-[10px] py-0">
                        {fieldLabel(field)}
                      </Badge>
                      <span className="line-through text-muted-foreground break-all">
                        {formatValue(change.old)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="break-all font-medium">
                        {formatValue(change.new)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {e.action === "delete" && snapshot && (
                <div className="text-xs space-y-1">
                  <div className="text-muted-foreground">
                    Snapshot przed usunięciem:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                    {Object.entries(snapshot)
                      .filter(
                        ([k, v]) =>
                          v != null &&
                          v !== "" &&
                          k !== "id" &&
                          k !== "created_at" &&
                          k !== "updated_at",
                      )
                      .map(([k, v]) => (
                        <div key={k} className="flex gap-2 min-w-0">
                          <span className="text-muted-foreground shrink-0">
                            {fieldLabel(k)}:
                          </span>
                          <span className="truncate font-medium">
                            {formatValue(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      <div className="text-xs text-muted-foreground text-center pt-1 flex items-center justify-center gap-1">
        <History className="h-3 w-3" />
        {entries.length} {entries.length === 1 ? "wpis" : "wpisów"} w historii
      </div>
    </div>
  );
}
