export const APP_VIEWS = ["swimming", "fishing"] as const;

export type AppView = (typeof APP_VIEWS)[number];

export function readView(search: string): AppView {
  const candidate = new URLSearchParams(search).get("view");

  return candidate === "fishing" ? "fishing" : "swimming";
}

export function viewHref(view: AppView): string {
  return `?view=${view}`;
}
