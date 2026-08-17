import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

import { getDataSource } from "@/services/dataSource";
import { getModuleById } from "@/services/supabase";
import type { ModuleModel } from "@/models/Module";

export default function StudentModuleDetailsScreen() {
  useRoleGuard("student");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  // const mod = useMemo(() => {
  //   mockDB.touch();
  //   return mockDB.read("modules", String(moduleId));
  // }, [moduleId, v]);

  const [mod, setMod] = useState<ModuleModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModuleDetails() {
      setIsLoading(true);

      if (getDataSource() === "mock") {
        mockDB.touch();
        const mockMod = mockDB.read("modules", String(moduleId));
        setMod(mockMod || null);
      } else {
        try {
          // Fetch real data from Supabase using your central queries
          const realMod = await getModuleById(String(moduleId));
          setMod(realMod);
        } catch (error) {
          console.error("Failed to load module details:", error);
          setMod(null);
        }
      }
      
      setIsLoading(false);
    }

    loadModuleDetails();
  }, [moduleId, v]);

  const enrolled = user?.role === "student" && mod?.enrolledStudents.includes(user.id);
  
  // return (
  //   <ScreenShell title={mod?.moduleName ?? "Module"} subtitle={mod?.moduleCode} showBack>
  //     {!mod ? (
  //       <Text style={{ color: colors.ink.muted }}>Module not found.</Text>
  //     ) : (
  //       <>
  //         <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
  //           <Badge label={`Class ${mod.classCode}`} tone="accent" />
  //           {mod.activeSessionId ? <Badge label="Live session" tone="primary" /> : <Badge label="No session" tone="muted" />}
  //         </View>

  //         <AppCard>
  //           <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
  //             When your lecturer starts attendance, a rotating code appears. You verify once with GPS — no continuous
  //             tracking.
  //           </Text>
  //         </AppCard>

  //         <View style={{ height: 14 }} />

  //         {enrolled ? (
  //           <AppButton
  //             title={mod.activeSessionId ? "Mark attendance" : "No active session"}
  //             disabled={!mod.activeSessionId}
  //             onPress={() => mod.activeSessionId && router.push(`/student/mark-attendance/${mod.id}`)}
  //           />
  //         ) : (
  //           <Text style={{ color: colors.palette.primary, fontWeight: "800" }}>You are not enrolled in this module.</Text>
  //         )}

  //         <View style={{ height: 10 }} />
  //         <AppButton title="Request join (demo)" variant="outline" onPress={() => router.push("/student/join-class")} />
  //       </>
  //     )}
  //   </ScreenShell>
  // );

return (
    <ScreenShell title={mod?.moduleName ?? "Module Details"} subtitle={mod?.moduleCode} showBack>
      
      {/* LOADING SPINNER STATE */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.palette.primary} style={{ marginTop: 40 }} />
      ) : !mod ? (
        <Text style={{ color: colors.ink.muted, marginTop: 20 }}>Module not found.</Text>
      ) : (
        <>
          {/* BADGES */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <Badge label={`Class ${mod.classCode}`} tone="accent" />
            {mod.activeSessionId ? (
              <Badge label="Live session" tone="primary" />
            ) : (
              <Badge label="No session" tone="muted" />
            )}
          </View>

          {/* 🟢 THE REAL DATABASE DATA DISPLAY (Clean UI) 🟢 */}
          <AppCard >
            <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 12 }}>
              Database Information
            </Text>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ color: colors.ink.muted }}>Record ID:</Text>
              <Text style={{ fontWeight: "500" }}>{mod.id}</Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ color: colors.ink.muted }}>Module Code:</Text>
              <Text style={{ fontWeight: "500" }}>{mod.moduleCode}</Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ color: colors.ink.muted }}>Lecturer ID:</Text>
              <Text style={{ fontWeight: "500", fontSize: 12 }}>{mod.lecturerId}</Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ color: colors.ink.muted }}>Total Enrolled:</Text>
              <Text style={{ fontWeight: "500" }}>
                {mod.enrolledStudents?.length || 0} students
              </Text>
            </View>
          </AppCard>

          {/* APP INSTRUCTIONS */}
          <AppCard>
            <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
              When your lecturer starts attendance, a rotating code appears. You verify once with GPS — no continuous
              tracking.
            </Text>
          </AppCard>

          {/* CALL TO ACTION BUTTONS */}
          {enrolled ? (
            <AppButton
              title={mod.activeSessionId ? "Mark attendance" : "No active session"}
              disabled={!mod.activeSessionId}
              onPress={() => mod.activeSessionId && router.push(`/student/mark-attendance/${mod.id}`)}
            />
          ) : (
            <>
            <Text style={{ color: colors.palette.primary, fontWeight: "800", marginVertical: 10 }}>
              You are not enrolled in this module.
            </Text>

            <View style={{ height: 10 }} />
          <AppButton title="Request join" variant="outline" onPress={() => router.push("/student/join-class")} />
           </>
          )}

          
        </>
      )}
    </ScreenShell>
  );
}
