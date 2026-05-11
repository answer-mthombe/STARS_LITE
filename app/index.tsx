import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/authStore";

export default function Index() {
  const { status, user } = useAuthStore();

  if (status === "loading") return <Redirect href="/splash" />;
  if (!user) return <Redirect href="/onboarding" />;

  if (user.role === "lecturer") return <Redirect href="/lecturer/dashboard" />;
  if (user.role === "admin") return <Redirect href="/admin/seed" />;
  return <Redirect href="/student/dashboard" />;
}
