declare module "@map-statuses" {
  export const STATUS_COLORS: Record<string, string>;
  export const STATUS_COLOR_FALLBACK: string;
  export const MAP_STATUSES: { key: string; name: string; color: string }[];
  export const STATUS_BY_KEY: Map<string, { key: string; name: string; color: string }>;
  export function normalizeStatusLabel(value: unknown): string;
  export function resolveStatusKey(rawStatus: unknown): string;
  export function statusMetaForKey(statusKey: string): { key: string; name: string; color: string };
  export function colorForStatusName(displayName: string | null | undefined): string;
  export function makePointKey(lat: number, lon: number, name: string): string;
  export function getStatusSeedRows(): {
    key: string;
    name: string;
    color: string;
    sortOrder: number;
  }[];
}
