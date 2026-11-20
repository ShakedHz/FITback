import { useSyncExternalStore } from 'react';
import { PASTEL_PALETTE, type PastelKey } from './pastelPalette';

export type { PastelKey };

/** Instructor-defined class type — name is free text in whatever language she typed. */
export interface CustomTrainingType {
  id: string;
  name: string;
  colorKey: PastelKey;
  createdAt: string;
}

export const CUSTOM_TRAINING_TYPE_PREFIX = 'custom-';
export const CUSTOM_TRAINING_TYPES_KEY = 'movana_custom_training_types_v1';

/** Peach-bloom tones not already taken by pilates (rose) and yoga (sand). */
const CUSTOM_PALETTE_ORDER: PastelKey[] = ['peach', 'caramel', 'cocoa', 'rose', 'sand'];

let cache: CustomTrainingType[] | null = null;
const listeners = new Set<() => void>();

function isPastelKey(value: unknown): value is PastelKey {
  return typeof value === 'string' && value in PASTEL_PALETTE;
}

function read(): CustomTrainingType[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TRAINING_TYPES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomTrainingType[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item?.id && item?.name)
      .map((item) => ({
        id: item.id,
        name: item.name,
        colorKey: isPastelKey(item.colorKey) ? item.colorKey : CUSTOM_PALETTE_ORDER[0],
        createdAt: item.createdAt ?? new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function loadCustomTrainingTypes(): CustomTrainingType[] {
  if (!cache) cache = read();
  return cache;
}

export function saveCustomTrainingTypes(items: CustomTrainingType[]): void {
  cache = items;
  try {
    localStorage.setItem(CUSTOM_TRAINING_TYPES_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable — keep the in-memory list so the session still works
  }
  listeners.forEach((fn) => fn());
}

export function isCustomTrainingTypeId(value: string): boolean {
  return value.startsWith(CUSTOM_TRAINING_TYPE_PREFIX);
}

export function findCustomTrainingType(id: string): CustomTrainingType | undefined {
  if (!isCustomTrainingTypeId(id)) return undefined;
  return loadCustomTrainingTypes().find((item) => item.id === id);
}

export function customTrainingTypeColor(id: string) {
  const custom = findCustomTrainingType(id);
  return custom ? PASTEL_PALETTE[custom.colorKey] : undefined;
}

/** Cycle the palette so consecutive custom types never look alike. */
export function nextCustomPaletteKey(existing: CustomTrainingType[]): PastelKey {
  const used = new Set(existing.map((item) => item.colorKey));
  return (
    CUSTOM_PALETTE_ORDER.find((key) => !used.has(key)) ??
    CUSTOM_PALETTE_ORDER[existing.length % CUSTOM_PALETTE_ORDER.length]
  );
}

function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || String(Date.now());
}

function uniqueId(name: string, existing: CustomTrainingType[]): string {
  const slug = slugFromName(name);
  const taken = new Set(existing.map((item) => item.id));
  let id = `${CUSTOM_TRAINING_TYPE_PREFIX}${slug}`;
  let n = 2;
  while (taken.has(id)) {
    id = `${CUSTOM_TRAINING_TYPE_PREFIX}${slug}-${n}`;
    n += 1;
  }
  return id;
}

/** Reuses an existing type when the same name is entered twice. */
export function addCustomTrainingType(name: string): CustomTrainingType | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = loadCustomTrainingTypes();
  const match = existing.find(
    (item) => item.name.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;

  const created: CustomTrainingType = {
    id: uniqueId(trimmed, existing),
    name: trimmed,
    colorKey: nextCustomPaletteKey(existing),
    createdAt: new Date().toISOString(),
  };
  saveCustomTrainingTypes([...existing, created]);
  return created;
}

export function removeCustomTrainingType(id: string): void {
  const existing = loadCustomTrainingTypes();
  const next = existing.filter((item) => item.id !== id);
  if (next.length !== existing.length) saveCustomTrainingTypes(next);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const EMPTY: CustomTrainingType[] = [];

export function useCustomTrainingTypes(): CustomTrainingType[] {
  return useSyncExternalStore(subscribe, loadCustomTrainingTypes, () => EMPTY);
}
