import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function LecturerAttendanceAnalyticsScreen() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const insight = useMemo(() => {
    mockDB.touch();
    if (!user || user.role !== "lecturer") return { sessions: 0, records: 0, modules: 0 };
    const modules = mockDB.list("modules").filter((m) => m.lecturerId === user.id);
    const sessions = mockDB.list("attendanceSessions").filter((s) => s.lecturerId === user.id);
    const records = mockDB
      .list("attendanceRecords")
      .filter((r) => sessions.some((s) => s.id === r.sessionId));
    return { sessions: sessions.length, records: records.length, modules: modules.length };
  }, [user, v]);

  return (
    <ScreenShell title="Analytics" subtitle="Simulation overview" showBack>
      <AppCard>
        <Row k="Modules" v={String(insight.modules)} />
        <Row k="Sessions (all time)" v={String(insight.sessions)} />
        <Row k="Attendance records" v={String(insight.records)} />
      </AppCard>
      <Text style={{ color: colors.ink.muted, marginTop: 16, lineHeight: 22 }}>
        Heatmaps and exports can plug into this layer when Supabase analytics is enabled.
      </Text>
      <View style={{ height: 16 }} />
      <Text onPress={() => router.push("/lecturer/dashboard")} style={{ color: colors.palette.primary, fontWeight: "900" }}>
        Back to dashboard
      </Text>
    </ScreenShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
      <Text style={{ color: colors.ink.muted, fontWeight: "800" }}>{k}</Text>
      <Text style={{ color: colors.ink.default, fontWeight: "900" }}>{v}</Text>
    </View>
  );
}
