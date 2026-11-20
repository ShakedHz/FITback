import { Capacitor, registerPlugin } from '@capacitor/core';

export interface GarminStatus {
  hasDevice: boolean;
  connected: boolean;
  appInstalled: boolean;
  deviceName?: string;
  deviceModel?: string;
}

export interface GarminSendResult {
  ok: boolean;
  /** Raw Connect IQ result name, e.g. success, app-not-found, too-large. */
  result: string;
}

/** One class as the watch app reads it (compact keys keep the message small). */
export interface WatchClass {
  s: string;
  e: string;
  t: string;
  l?: string;
  p: { t: string; x: string[] }[];
}

export interface WatchPayload {
  v: number;
  d: string;
  c: WatchClass[];
}

interface GarminBridgePlugin {
  selectDevice(): Promise<GarminStatus>;
  getStatus(): Promise<GarminStatus>;
  forgetDevice(): Promise<GarminStatus>;
  syncDay(options: { payload: WatchPayload }): Promise<GarminSendResult>;
  openStore(): Promise<void>;
  addListener(
    event: 'syncRequested',
    listener: (data: { cmd: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
  addListener(
    event: 'statusChanged',
    listener: (data: GarminStatus) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const GarminBridge = registerPlugin<GarminBridgePlugin>('GarminBridge');

const OFFLINE: GarminStatus = { hasDevice: false, connected: false, appInstalled: false };

/** The bridge only exists in the native iPhone build; the browser build stays inert. */
export function isGarminSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('GarminBridge');
}

export async function getGarminStatus(): Promise<GarminStatus> {
  if (!isGarminSupported()) return OFFLINE;
  try {
    return await GarminBridge.getStatus();
  } catch {
    return OFFLINE;
  }
}

export async function selectGarminDevice(): Promise<GarminStatus> {
  if (!isGarminSupported()) return OFFLINE;
  return GarminBridge.selectDevice();
}

export async function forgetGarminDevice(): Promise<GarminStatus> {
  if (!isGarminSupported()) return OFFLINE;
  return GarminBridge.forgetDevice();
}

export async function sendDayToWatch(payload: WatchPayload): Promise<GarminSendResult> {
  if (!isGarminSupported()) return { ok: false, result: 'unsupported' };
  try {
    return await GarminBridge.syncDay({ payload });
  } catch (err) {
    return { ok: false, result: err instanceof Error ? err.message : 'failed' };
  }
}

export async function openGarminStore(): Promise<void> {
  if (!isGarminSupported()) return;
  try {
    await GarminBridge.openStore();
  } catch {
    /* the watch app is sideloaded, so the store page may not exist */
  }
}

export function onGarminSyncRequested(listener: () => void): () => void {
  if (!isGarminSupported()) return () => {};
  const handle = GarminBridge.addListener('syncRequested', listener);
  return () => {
    void handle.then((h) => h.remove());
  };
}

export function onGarminStatusChanged(listener: (status: GarminStatus) => void): () => void {
  if (!isGarminSupported()) return () => {};
  const handle = GarminBridge.addListener('statusChanged', listener);
  return () => {
    void handle.then((h) => h.remove());
  };
}
