import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { moduleEnrollmentService } from "@/services/moduleEnrollmentService";
import { useToastStore } from "@/store/toastStore";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

import { isSupabaseEnabled } from "@/supabase/client";
import { getModuleById } from "@/services/supabase/moduleRepository";
import { getStudentsByIds } from "@/services/supabase/studentRepository";
import type { StudentModel } from "@/models/Student";
import { useFocusEffect } from "@react-navigation/native";

export default function LecturerStudentManagementScreen() {
  useRoleGuard("lecturer");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const show = useToastStore((s) => s.show);
  const v = useMockDbVersionStore((s) => s.version);
  const [manualId, setManualId] = useState("");
  const [busy, setBusy] = useState(false);

  const [mod, setMod] = useState<any>(null);
  const [studentsById, setStudentsById] = useState<Record<string, StudentModel>>({});
  const [loading, setLoading] = useState(true);

  const fetchModuleData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSupabaseEnabled()) {
        const liveMod = await getModuleById(String(moduleId));
        setMod(liveMod);

        // Resolve names for everyone shown on this screen in one batch call.
        const ids = Array.from(
          new Set([
            ...(liveMod?.pendingRequests || []),
            ...(liveMod?.enrolledStudents || []),
          ])
        );
        if (ids.length > 0) {
          const students = await getStudentsByIds(ids);
          const map: Record<string, StudentModel> = {};
          students.forEach((s) => {
            map[s.id] = s;
          });
          setStudentsById(map);
        } else {
          setStudentsById({});
        }
      } else {
        mockDB.touch();
        const mockMod = mockDB.read("modules", String(moduleId));
        setMod(mockMod);
      }
    } catch (e) {
      console.error("Failed to load module:", e);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      (async () => {
        if (isActive) await fetchModuleData();
      })();

      return () => {
        isActive = false;
      };
    }, [fetchModuleData, v])
  );

  function studentName(sid: string): string {
    if (isSupabaseEnabled()) {
      return studentsById[sid]?.fullName ?? sid;
    }
    return mockDB.read("students", sid)?.fullName ?? sid;
  }

  async function handleAccept(sid: string) {
    setBusy(true);
    try {
      await moduleEnrollmentService.acceptPending(mod.id, sid);
      show({ type: "success", title: "Accepted" });
      await fetchModuleData();
    } catch (e) {
      show({
        type: "error",
        title: "Failed to accept",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(sid: string) {
    setBusy(true);
    try {
      await moduleEnrollmentService.rejectPending(mod.id, sid);
      show({ type: "info", title: "Rejected" });
      await fetchModuleData();
    } catch (e) {
      show({
        type: "error",
        title: "Failed to reject",
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleManualAdd() {
    const studentId = manualId.trim();
    if (!studentId) return;

    setBusy(true);
    try {
      await moduleEnrollmentService.manualAddStudent(mod.id, studentId);
      show({ type: "success", title: "Student added" });
      setManualId("");
      await fetchModuleData();
    } catch (e) {
      show({
        type: "error",
        title: "Failed",
        message: e instanceof Error ? e.message : "Check student id",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenShell title="Students" subtitle={mod?.moduleName} showBack>
      {loading ? (
        <Text style={{ color: colors.ink.muted, marginTop: 20 }}>Loading...</Text>
      ) : !mod ? (
        <Text style={{ color: colors.ink.muted, marginTop: 20 }}>Module not found.</Text>
      ) : (
        <>
          <AppButton title="Start attendance session" onPress={() => router.push(`/lecturer/create-session/${mod.id}`)} />
          <View style={{ height: 14 }} />
          {mod.activeSessionId ? (
            <AppButton title="Open live session" variant="outline" onPress={() => router.push(`/lecturer/active-session/${mod.activeSessionId}`)} />
          ) : null}

          <View style={{ height: 22 }} />
          <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Pending requests</Text>
          <AppCard>
            {(mod.pendingRequests || []).length === 0 ? (
              <Text style={{ color: colors.ink.muted }}>None</Text>
            ) : (
              (mod.pendingRequests || mod.pending_requests || []).map((sid: string) => (
                <View key={sid} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                  <Text style={{ color: colors.ink.default, fontWeight: "700" }}>{studentName(sid)}</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable disabled={busy} onPress={() => handleAccept(sid)}>
                      <Text style={{ color: colors.palette.accent, fontWeight: "900", opacity: busy ? 0.5 : 1 }}>Accept</Text>
                    </Pressable>
                    <Pressable disabled={busy} onPress={() => handleReject(sid)}>
                      <Text style={{ color: colors.palette.primary, fontWeight: "900", opacity: busy ? 0.5 : 1 }}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </AppCard>

          <View style={{ height: 18 }} />
          <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Enrolled</Text>
          <AppCard>
            {(mod.enrolledStudents || []).length === 0 ? (
              <Text style={{ color: colors.ink.muted }}>No students yet</Text>
            ) : (
              (mod.enrolledStudents || mod.enrolled_students || []).map((sid: string) => (
                <View
                  key={sid}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.subtle,
                  }}
                >
                  <Text style={{ color: colors.ink.default, fontWeight: "700" }}>{studentName(sid)}</Text>
                </View>
              ))
            )}
          </AppCard>

          <View style={{ height: 18 }} />
          <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Manual add (student id)</Text>
          <AppInput label="Student id" value={manualId} onChangeText={setManualId} autoCapitalize="none" placeholder="stu_..." />
          <View style={{ height: 10 }} />
          <AppButton title="Add to module" variant="outline" disabled={busy} onPress={handleManualAdd} />
        </>
      )}
    </ScreenShell>
  );
}

