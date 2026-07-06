import { useMemo } from "react";
import { Text, View } from "react-native";

//added 
import { useEffect, useState } from "react";
import { getDataSource } from "@/services/dataSource";
import { listForStudent } from "@/services/supabase/attendanceRecordRepository";

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
  const [rows, setRows] = useState<any[]>([]);


  useEffect(() => {
  async function loadHistory() {
    if (!user || user.role !== "student") {
      setRows([]);
      return;
    }

    if (getDataSource() === "mock") {
      mockDB.touch();

      const recs = mockDB
        .list("attendanceRecords")
        .filter((r) => r.studentId === user.id)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

      const mapped = recs.map((r) => {
        const sess = mockDB.read("attendanceSessions", r.sessionId);
        const mod = sess ? mockDB.read("modules", sess.moduleId) : null;

        return {
          id: r.id,
          title: mod?.moduleName ?? "Session",
          subtitle: new Date(r.timestamp).toLocaleString(),
          verified: r.verified,
          distanceM: r.distance,
        };
      });

      setRows(mapped);
    } else {
      const recs = await listForStudent(user.id);

      const mapped = recs.map((r) => ({
        id: r.id,
        title: r.session?.module?.module_name ?? "Session",
        subtitle: new Date(
          r.session?.created_at ?? r.timestamp
        ).toLocaleString(),

        // Temporary mapping until verification logic is migrated
        verified: r.verified,

        // Supabase currently has no distance field
        distanceM: undefined,
      }));

      setRows(mapped);
    }
  }

  loadHistory();
}, [user, v]);


  // const rows = useMemo(() => {
  //   mockDB.touch();
  //   if (!user || user.role !== "student") return [];
  //   const recs = mockDB
  //     .list("attendanceRecords")
  //     .filter((r) => r.studentId === user.id)
  //     .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  //   return recs.map((r) => {
  //     const sess = mockDB.read("attendanceSessions", r.sessionId);
  //     const mod = sess ? mockDB.read("modules", sess.moduleId) : null;
  //     return { r, title: mod?.moduleName ?? "Session", subtitle: new Date(r.timestamp).toLocaleString() };
  //   });
  // }, [user, v]);

  return (
    <ScreenShell title="Attendance history" showBack>
      {rows.length === 0 ? (
        <Text style={{ color: colors.ink.muted }}>No records yet. Mark attendance during a live session.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map(( r)=> (
<AttendanceCard
    key={r.id}
    title={r.title}
    subtitle={r.subtitle}
    distanceM={r.distanceM}
    verified={r.verified}
/>          ))}
        </View>
      )}
    </ScreenShell>
  );
}
