import { Stack } from "expo-router";

export default function HodLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
