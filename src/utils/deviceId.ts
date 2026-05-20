import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "mut_device_id_v1";

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * Stable per-install device id for demo + anti-duplication.
 * - Native: SecureStore
 * - Web: localStorage
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === "web") {
    try {
      const ls = typeof globalThis !== "undefined" && "localStorage" in globalThis ? globalThis.localStorage : null;
      const existing = ls?.getItem(KEY);
      if (existing && /^[0-9a-f]{16}$/i.test(existing)) return existing;
      const created = randomHex(16);
      ls?.setItem(KEY, created);
      return created;
    } catch {
      return randomHex(16);
    }
  }

  const existing = await SecureStore.getItemAsync(KEY);
  if (existing && /^[0-9a-f]{16}$/i.test(existing)) return existing;
  const created = randomHex(16);
  await SecureStore.setItemAsync(KEY, created);
  return created;
}

