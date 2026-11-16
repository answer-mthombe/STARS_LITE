import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { getDataSource } from "@/services/dataSource";
import { listModulesForLecturer } from "@/services/supabase/moduleRepository";
import {
  attendanceRepository,
  type LiveAttendanceSession,
  type RecentAttendanceSession,
} from "@/services/supabase/attendanceRepository";

import {
  AppText,
  Chip,
  LinkText,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { ModuleModel } from "@/models/Module";

export default function LecturerDashboard() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const [modules, setModules] = useState<ModuleModel[]>([]);
  const [live, setLive] = useState<LiveAttendanceSession[]>([]);
  const [recent, setRecent] = useState<RecentAttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user || user.role !== "lecturer") {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (getDataSource() === "supabase") {
          const mods = await listModulesForLecturer(user.id);
          setModules(mods);

          const [l, r] = await Promise.all([
            attendanceRepository.getLiveAttendanceSessions(user.id),
            attendanceRepository.getRecentAttendanceSessions(user.id),
          ]);
          setLive(l);
          setRecent(r);
        } else {
          mockDB.touch();
          const all = mockDB.list("modules");
          setModules(all.filter((m) => m.lecturerId === user.id));
        }
      } catch (error) {
        console.error("Failed to load lecturer dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, v]);

  const first =
    user?.role === "lecturer"
      ? user.fullName?.trim().split(/\s+/)[0] ?? "Lecturer"
      : "";

  // ─── Derived insights for the problem-solver view ─────────
  const totalAlerts = live.reduce((acc, s) => acc + s.leftCount, 0);
  const totalInside = live.reduce((acc, s) => acc + s.insideCount, 0);
  const totalOnBreak = live.reduce((acc, s) => acc + s.onBreakCount, 0);
  const hasAnyLive = live.length > 0;

  return (
    <ScreenShell
      title={`Hi ${first}`}
      subtitle="Here's what's happening in your classes"
      right={
        <LinkText onPress={() => router.push("/notifications")}>Alerts</LinkText>
      }
    >
      {/* ─── QUESTION 1: IS ANYTHING HAPPENING RIGHT NOW? ─── */}
      <SectionHeader title="Right now" overline />

      {hasAnyLive ? (
        <Stack gap="sm" style={{ marginBottom: 20 }}>
          {/* Aggregate status strip */}
          <View
            style={{
              backgroundColor: totalAlerts > 0 ? "#FDECEA" : "#E8F5E9",
              borderLeftWidth: 4,
              borderLeftColor: totalAlerts > 0 ? "#C0392B" : "#2E7D32",
              padding: 14,
              borderRadius: 10,
            }}
          >
            <AppText
              variant="body"
              style={{
                fontWeight: "700",
                color: totalAlerts > 0 ? "#C0392B" : "#1B5E20",
                marginBottom: 6,
              }}
            >
              {totalAlerts > 0
                ? `⚠ ${totalAlerts} student${totalAlerts > 1 ? "s" : ""} left the room`
                : "✓ Everyone is where they should be"}
            </AppText>
            <AppText variant="body" style={{ fontSize: 13, color: "#444" }}>
              🟢 {totalInside} inside · 🟡 {totalOnBreak} on break · 🔴{" "}
              {totalAlerts} out
            </AppText>
          </View>

          {/* Per-session cards */}
          {live.map((s) => {
            const alert = s.leftCount > 0;
            return (
              <View
                key={s.id}
                style={{
                  borderWidth: 1,
                  borderColor: alert ? "#F5B7B1" : "#D5DBDB",
                  borderRadius: 10,
                  padding: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Row
                  gap="sm"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <AppText
                    variant="body"
                    style={{ fontWeight: "700", fontSize: 16 }}
                  >
                    {s.moduleCode}
                  </AppText>
                  <Chip label="LIVE" variant="accent" />
                </Row>

                <AppText
                  variant="body"
                  style={{ fontSize: 13, color: "#555", marginBottom: 10 }}
                >
                  {s.insideCount} of {s.totalStudents} students inside
                  {s.onBreakCount > 0 ? ` · ${s.onBreakCount} on break` : ""}
                  {s.leftCount > 0 ? ` · ${s.leftCount} left` : ""}
                </AppText>

                <Row gap="sm">
                  <Chip
                    label="Open live view"
                    variant="accent"
                    onPress={() =>
                      router.push(
                        `/lecturer/attendance/live/${s.id}` as never
                      )
                    }
                  />
                </Row>
              </View>
            );
          })}
        </Stack>
      ) : (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            padding: 16,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            No live sessions. Start one below to begin tracking.
          </AppText>
        </View>
      )}

      {/* ─── QUESTION 2: WHAT HAPPENED LAST TIME? (collapsed) ─── */}
      <SectionHeader title="Past sessions" overline />

      <View
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "#FAFBFC",
          marginBottom: 20,
        }}
      >
        <Row
          gap="sm"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <AppText variant="body" style={{ fontWeight: "700", fontSize: 16 }}>
            📊 View reports
          </AppText>
          {recent.length > 0 ? (
            <AppText variant="body" style={{ fontSize: 12, color: "#687076" }}>
              {recent.length} recent
            </AppText>
          ) : null}
        </Row>

        <AppText
          variant="body"
          style={{ fontSize: 13, color: "#555", marginBottom: 12 }}
        >
          Average stay time, early exits, and attendance trends per module.
        </AppText>

        <Row gap="sm">
          <Chip
            label="Open all reports"
            variant="accent"
            onPress={() => router.push("/lecturer/attendance/reports" as never)}
          />
        </Row>
      </View>

      {/* ─── QUESTION 3: WHICH CLASS DO I START NOW? ─── */}
      <SectionHeader title="Start tracking a class" overline />

      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          Loading your modules…
        </AppText>
      ) : modules.length === 0 ? (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            padding: 16,
            borderRadius: 10,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            You're not listed as a lecturer on any module yet.
          </AppText>
        </View>
      ) : (
        <Stack gap="md">
          {modules.map((m) => {
            const isLive = live.some((s) => s.moduleId === m.id);
            return (
              <View
                key={m.id}
                style={{
                  borderWidth: 1,
                  borderColor: isLive ? "#A5D6A7" : "#E5E7EB",
                  borderRadius: 10,
                  padding: 16,
                  backgroundColor: isLive ? "#F1F8E9" : "#FFFFFF",
                }}
              >
                <Row
                  gap="sm"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText
                      variant="body"
                      style={{ fontWeight: "700", fontSize: 16 }}
                    >
                      {m.moduleCode}
                    </AppText>
                    <AppText
                      variant="body"
                      style={{ fontSize: 13, color: "#555", marginTop: 2 }}
                    >
                      {m.moduleName}
                    </AppText>
                  </View>
                  {isLive ? (
                    <Chip label="● Running" variant="accent" />
                  ) : (
                    <Chip label="Idle" variant="outline" />
                  )}
                </Row>

                {isLive ? (
                  <Row gap="sm">
                    <Chip
                      label="Open live view"
                      variant="accent"
                      onPress={() =>
                        router.push(
                          `/lecturer/attendance/live/${
                            live.find((s) => s.moduleId === m.id)?.id
                          }` as never
                        )
                      }
                    />
                  </Row>
                ) : (
                  <Row gap="sm">
                    <Chip
                      label="▶ Start attendance"
                      variant="accent"
                      onPress={() =>
                        router.push(
                          `/lecturer/attendance/start/${m.id}` as never
                        )
                      }
                    />
                    <Chip
                      label="View past reports"
                      variant="outline"
                      onPress={() =>
                        router.push(
                          `/lecturer/attendance/reports/${m.id}` as never
                        )
                      }
                    />
                  </Row>
                )}
              </View>
            );
          })}
        </Stack>
      )}

      {/* ─── Secondary access ─── */}
      <Spacer size="lg" />
      <SectionHeader title="Other tools" overline />
      <Row gap="sm" style={{ flexWrap: "wrap" }}>
        <Chip
          label="Module management"
          variant="outline"
          onPress={() => router.push("/lecturer/modules" as never)}
        />
        <Chip
          label="Analytics"
          variant="outline"
          onPress={() => router.push("/lecturer/analytics" as never)}
        />
        <Chip
          label="Audit log"
          variant="outline"
          onPress={() => router.push("/lecturer/audit" as never)}
        />
      </Row>

      <Spacer size="lg" />
      <RoleQuickNav role="lecturer" />
    </ScreenShell>
  );
}