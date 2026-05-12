import { Stack } from "expo-router";

export default function DeanLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
