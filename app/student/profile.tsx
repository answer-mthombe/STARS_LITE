import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { Avatar } from "@/components/ui/Avatar";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";

export default function StudentProfileScreen() {
  useRoleGuard("student");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const stu = user?.role === "student" ? mockDB.read("students", user.id) : null;
  const faculty = stu ? mockDB.read("faculties", stu.facultyId) : null;
  const course = stu ? mockDB.read("courses", stu.courseId) : null;

  return (
    <ScreenShell title="Profile" showBack>
      {user?.role === "student" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Avatar name={user.fullName} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink.default, fontSize: 20, fontWeight: "900" }}>{user.fullName}</Text>
            <Text style={{ color: colors.ink.muted, marginTop: 4 }}>{user.email}</Text>
          </View>
        </View>
      ) : null}

      <AppCard>
        <Row label="Student number" value={stu?.studentNumber ?? "—"} />
        <Row label="Faculty" value={faculty?.facultyName ?? "—"} />
        <Row label="Course" value={course?.courseName ?? "—"} />
        <Row label="Device" value={stu?.deviceId ?? "—"} />
      </AppCard>

      <View style={{ height: 24 }} />
      <Text onPress={() => logout().then(() => router.replace("/onboarding"))} style={{ color: colors.palette.primary, fontWeight: "900" }}>
        Sign out
      </Text>
    </ScreenShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
      <Text style={{ color: colors.palette.accent, fontWeight: "800", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.ink.default, marginTop: 4, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
