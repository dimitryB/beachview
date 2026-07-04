export const APP_VIEWS = ["swimming", "fishing", "config"] as const;

export type AppView = (typeof APP_VIEWS)[number];

export function readView(search: string): AppView {
  const candidate = new URLSearchParams(search).get("view");

  return candidate === "fishing" || candidate === "config"
    ? candidate
    : "swimming";
}

export function viewHref(view: AppView): string {
  return `?view=${view}`;
}
