/**
 * Minimal CSV serializer/parser for offline backup & restore.
 * Quotes any cell that contains a comma, double-quote, or newline.
 * Reads RFC4180-style quoted fields and embedded newlines.
 */

export type CSVColumn<T> = {
  header: string;
  /** Extract raw value — null/undefined become empty cell. */
  get: (row: T) => string | number | null | undefined;
};

/** Serialize rows to CSV with header row. Uses UTF-8 BOM so Excel opens correctly. */
export function toCSV<T>(rows: T[], columns: CSVColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(","));
  for (const r of rows) {
    lines.push(
      columns
        .map((c) => {
          const v = c.get(r);
          return escapeCell(v == null ? "" : String(v));
        })
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

function escapeCell(s: string): string {
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** Trigger a file download in the browser (works inside Tauri webview too). */
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse a CSV string into rows of string cells.
 * Handles quoted fields, escaped quotes (""), and CR/LF/CRLF line endings.
 * Strips a leading UTF-8 BOM if present.
 */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cur.push(field);
      field = "";
    } else if (ch === "\r") {
      // swallow — handled by \n
    } else if (ch === "\n") {
      cur.push(field);
      field = "";
      rows.push(cur);
      cur = [];
    } else {
      field += ch;
    }
  }
  // flush trailing field/row if file doesn't end with newline
  if (field !== "" || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

/** Format unix-seconds timestamp as ISO string (for CSV export). */
export function unixToISO(ts: number | null | undefined): string {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}
