import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "mut_auth_user_v1";

/**
 * SecureStore works on iOS/Android. On web it is not available — use localStorage
 * so auth flows work in the browser during development.
 */
export const authStorage = {
  async getItem(): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof globalThis !== "undefined" && "localStorage" in globalThis
          ? globalThis.localStorage.getItem(KEY)
          : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(KEY);
  },

  async setItem(value: string): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        globalThis.localStorage.setItem(KEY, value);
      }
      return;
    }
    await SecureStore.setItemAsync(KEY, value);
  },

  async removeItem(): Promise<void> {
    if (Platform.OS === "web") {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
        globalThis.localStorage.removeItem(KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(KEY);
  },
};
