
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { getDataSource } from "@/services/dataSource";
import { listModulesForLecturer } from "@/services/supabase/moduleRepository";

import {
  attendanceRepository,
  type LiveAttendanceSession,
} from "@/services/supabase/attendanceRepository";

import {
  AppText,
  Chip,
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
  const user = useAuthStore((state) => state.user);
  const version = useMockDbVersionStore((state) => state.version);

  const [modules, setModules] = useState<ModuleModel[]>([]);
  const [live, setLive] = useState<LiveAttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!user || user.role !== "lecturer") {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (getDataSource() === "supabase") {
          const [moduleList, liveSessions] = await Promise.all([
            listModulesForLecturer(user.id),
            attendanceRepository.getLiveAttendanceSessions(user.id),
          ]);

          if (!mounted) return;

          setModules(moduleList);
          setLive(liveSessions);
        } else {
          mockDB.touch();

          const all = mockDB.list("modules");

          if (!mounted) return;

          setModules(all.filter((module) => module.lecturerId === user.id));
          setLive([]);
        }
      } catch (error) {
        console.error("[STARS] Lecturer dashboard error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [user, version]);

  const first =
    user?.role === "lecturer"
      ? user.fullName?.trim().split(/\s+/)[0] ?? "Lecturer"
      : "Lecturer";

  return (
    <ScreenShell
      title={`Hi ${first}`}
      subtitle="Manage your classroom attendance"
    >
      {/* LIVE ATTENDANCE */}
      <SectionHeader title="Live attendance" overline />

      {live.length > 0 ? (
        <Stack gap="sm" style={{ marginBottom: 20 }}>
          {live.map((session) => (
            <View
              key={session.id}
              style={{
                borderWidth: 1,
                borderColor: "#A5D6A7",
                borderRadius: 10,
                padding: 14,
                backgroundColor: "#F1F8E9",
              }}
            >
              <Row
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <AppText variant="body" style={{ fontWeight: "700" }}>
                  {session.moduleCode}
                </AppText>

                <Chip label="LIVE" variant="accent" />
              </Row>

              <AppText
                variant="body"
                style={{
                  fontSize: 13,
                  color: "#555",
                  marginBottom: 12,
                }}
              >
                {session.insideCount} of {session.totalStudents} students inside
              </AppText>

              <Chip
                label="Open live attendance"
                variant="accent"
                onPress={() =>
                  router.push(
                    `/lecturer/attendance/live/${session.id}` as never
                  )
                }
              />
            </View>
          ))}
        </Stack>
      ) : (
        <View
          style={{
            backgroundColor: "#F4F6F8",
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <AppText variant="body" style={{ color: "#687076" }}>
            No attendance session is currently running.
          </AppText>
        </View>
      )}

      {/* HISTORY NAVIGATION ONLY */}
      <SectionHeader title="Attendance records" overline />

      <View
        style={{
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: 10,
          padding: 15,
          marginBottom: 22,
          backgroundColor: "#FFFFFF",
        }}
      >
        <AppText variant="body" style={{ fontWeight: "700", fontSize: 16 }}>
          Attendance history
        </AppText>

        <AppText
          variant="body"
          style={{
            fontSize: 13,
            color: "#687076",
            marginTop: 5,
            marginBottom: 12,
          }}
        >
          View completed attendance registers for all your modules.
        </AppText>

        <Chip
          label="Open attendance history"
          variant="accent"
          onPress={() =>
            router.push("/lecturer/attendance/history" as never)
          }
        />
      </View>

      {/* MODULES */}
      <SectionHeader title="My modules" overline />

      {loading ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          Loading your modules…
        </AppText>
      ) : modules.length === 0 ? (
        <AppText variant="body" style={{ color: "#687076" }}>
          You're not listed as a lecturer on any module yet.
        </AppText>
      ) : (
        <Stack gap="sm">
          {modules.map((module) => {
            const activeSession = live.find(
              (session) => session.moduleId === module.id
            );

            return (
              <View
                key={module.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  padding: 14,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <AppText variant="body" style={{ fontWeight: "700" }}>
                  {module.moduleCode}
                </AppText>

                <AppText
                  variant="body"
                  style={{
                    fontSize: 13,
                    color: "#687076",
                    marginTop: 3,
                    marginBottom: 12,
                  }}
                >
                  {module.moduleName}
                </AppText>

                {activeSession ? (
                  <Chip
                    label="Open live attendance"
                    variant="accent"
                    onPress={() =>
                      router.push(
                        `/lecturer/attendance/live/${activeSession.id}` as never
                      )
                    }
                  />
                ) : (
                  <Chip
                    label="Start attendance"
                    variant="accent"
                    onPress={() =>
                      router.push(
                        `/lecturer/attendance/start/${module.id}` as never
                      )
                    }
                  />
                )}
              </View>
            );
          })}
        </Stack>
      )}

      <Spacer size="lg" />
      <RoleQuickNav role="lecturer" />
    </ScreenShell>
  );
}
