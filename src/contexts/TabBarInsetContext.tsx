import { createContext, useContext } from "react";

export const TabBarInsetContext = createContext(0);

export function useTabBarInset(): number {
  return useContext(TabBarInsetContext);
}
