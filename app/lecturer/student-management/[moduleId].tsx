import { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";

export default function LecturerStudentManagementScreen() {
  useRoleGuard("lecturer");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const show = useToastStore((s) => s.show);
  const v = useMockDbVersionStore((s) => s.version);
  const [manualId, setManualId] = useState("");

 // const mod = useMemo(() => mockDB.read("modules", String(moduleId)), [moduleId, v]);

 const [mod, setMod] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchModuleData() {
        setLoading(true);
        try {
          if (isSupabaseEnabled()) {
            const liveMod = await getModuleById(String(moduleId));
            if (isActive) setMod(liveMod);
          } else {
            mockDB.touch();
            const mockMod = mockDB.read("modules", String(moduleId));
            if (isActive) setMod(mockMod);
          }
        } catch (e) {
          console.error("Failed to load module:", e);
        } finally {
          if (isActive) setLoading(false);
        }
      }

      fetchModuleData();

      return () => {
        isActive = false; // Cleanup to prevent memory leaks if you navigate away fast
      };
    }, [moduleId, v])
  );

  return (
    <ScreenShell title="Students" subtitle={mod?.moduleName} showBack>
      {/* {!mod ? (
        <Text style={{ color: colors.ink.muted }}>Module not found.</Text>
      ) : ( */}

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
              mod.pendingRequests.map((sid:string) => {
                const s = mockDB.read("students", sid);
                return (
                  <View key={sid} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border.subtle }}>
                    <Text style={{ color: colors.ink.default, fontWeight: "700" }}>{s?.fullName ?? sid}</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable onPress={() => { moduleEnrollmentService.acceptPending(mod.id, sid); show({ type: "success", title: "Accepted" }); }}>
                        <Text style={{ color: colors.palette.accent, fontWeight: "900" }}>Accept</Text>
                      </Pressable>
                      <Pressable onPress={() => { moduleEnrollmentService.rejectPending(mod.id, sid); show({ type: "info", title: "Rejected" }); }}>
                        <Text style={{ color: colors.palette.primary, fontWeight: "900" }}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </AppCard>

          <View style={{ height: 18 }} />
          <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Enrolled</Text>
          <AppCard>
           {(mod.enrolledStudents || []).length === 0 ? (
              <Text style={{ color: colors.ink.muted }}>No students yet</Text>
            ) : (
              mod.enrolledStudents.map((sid:string) => {
                const s = mockDB.read("students", sid);
                return (
                  <View
                    key={sid}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.subtle,
                    }}
                  >
                    <Text style={{ color: colors.ink.default, fontWeight: "700" }}>{s?.fullName ?? sid}</Text>
                  </View>
                );
              })
            )}
          </AppCard>

          <View style={{ height: 18 }} />
          <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Manual add (student id)</Text>
          <AppInput label="Student id" value={manualId} onChangeText={setManualId} autoCapitalize="none" placeholder="stu_..." />
          <View style={{ height: 10 }} />
          <AppButton
            title="Add to module"
            variant="outline"
            onPress={() => {
              try {
                moduleEnrollmentService.manualAddStudent(mod.id, manualId.trim());
                show({ type: "success", title: "Student added" });
                setManualId("");
              } catch (e) {
                show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "Check id" });
              }
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}
