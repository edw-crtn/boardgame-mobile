export function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return iso;
  }
}
