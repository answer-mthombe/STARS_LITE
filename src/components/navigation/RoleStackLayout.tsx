import { Stack } from "expo-router";

/** Stack above role tabs — detail screens hide the tab bar */
export function RoleStackLayout({ children }: { children?: React.ReactNode }) {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      {children}
    </Stack>
  );
}
