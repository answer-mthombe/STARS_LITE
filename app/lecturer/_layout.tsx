import { Stack } from "expo-router";

export default function LecturerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-session/[moduleId]" />
      <Stack.Screen name="active-session/[sessionId]" />
      <Stack.Screen name="test-session/[moduleId]" />
      <Stack.Screen name="test-invigilate/[testSessionId]" />
      <Stack.Screen name="student-management/[moduleId]" />
      <Stack.Screen name="register/[registerId]" />
    </Stack>
  );
}
