import { useMemo } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AttendanceCard } from "@/components/ui/AttendanceCard";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function StudentAttendanceHistoryScreen() {
  useRoleGuard("student");
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const rows = useMemo(() => {
    mockDB.touch();
    if (!user || user.role !== "student") return [];
    const recs = mockDB
      .list("attendanceRecords")
      .filter((r) => r.studentId === user.id)
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return recs.map((r) => {
      const sess = mockDB.read("attendanceSessions", r.sessionId);
      const mod = sess ? mockDB.read("modules", sess.moduleId) : null;
      return { r, title: mod?.moduleName ?? "Session", subtitle: new Date(r.timestamp).toLocaleString() };
    });
  }, [user, v]);

  return (
    <ScreenShell title="Attendance history" showBack>
      {rows.length === 0 ? (
        <Text style={{ color: colors.ink.muted }}>No records yet. Mark attendance during a live session.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map(({ r, title, subtitle }) => (
            <AttendanceCard key={r.id} title={title} subtitle={subtitle} distanceM={r.distance} verified={r.verified} />
          ))}
        </View>
      )}
    </ScreenShell>
  );
}
