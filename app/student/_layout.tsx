import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modules/[moduleId]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="mark-attendance/[moduleId]" />
    </Stack>
  );
}
