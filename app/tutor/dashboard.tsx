import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { ModuleCard } from "@/components/ui/ModuleCard";
import { RoleScopeCard } from "@/components/ui/RoleScopeCard";
import { DelegationBadge } from "@/components/ui/DelegationBadge";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { delegationService } from "@/services/delegationService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { colors } from "@/theme";

export default function TutorDashboard() {
  useRoleGuard("tutor");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const version = useMockDbVersionStore((s) => s.version);

  const modules = useMemo(() => {
    if (!user || user.role !== "tutor") return [];
    mockDB.touch();
    return user.moduleIds
      .map((id) => mockDB.read("modules", id))
      .filter(Boolean)
      .map((m) => {
        const del = delegationService
          .listModuleDelegations(m!.id)
          .find((d) => d.delegateStudentId === user.studentId && d.active);
        return { module: m!, delegation: del };
      });
  }, [user, version]);

  const activeTests = useMemo(() => {
    if (!user || user.role !== "tutor") return [];
    mockDB.touch();
    return testInvigilationService
      .listInvigilationForPerson(user.studentId)
      .filter((t) => t.status === "active" || t.status === "awaiting_lecturer_confirm");
  }, [user, version]);

  if (!user || user.role !== "tutor") return null;

  const tutorProfile = mockDB.query("tutors", { studentId: user.studentId })[0];

  return (
    <ScreenShell
      title="Tutor hub"
      subtitle="You are a senior student — paid by hours; submit timesheets after class or tests"
    >
      <RoleScopeCard
        role="tutor"
        scopeLabel={user.fullName}
        detail={`Year ${tutorProfile?.yearLevel ?? "—"} · ${(tutorProfile?.totalLoggedHours ?? 0).toFixed(1)}h logged`}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <Pressable
          onPress={() => router.push("/tutor/timesheets")}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.palette.primary }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Timesheets</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/tutor/registers")}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.palette.accent }}
        >
          <Text style={{ color: colors.palette.accent, fontWeight: "800", fontSize: 12 }}>PDF registers</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/lecturer/register/reg_class_mobile" as never)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.palette.primary }}
        >
          <Text style={{ color: colors.palette.primary, fontWeight: "800", fontSize: 12 }}>Print class PDF</Text>
        </Pressable>
      </View>
      {activeTests.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "800", color: colors.palette.accent, marginBottom: 8 }}>Test invigilation</Text>
          {activeTests.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/tutor/test-invigilate/${t.id}` as never)}
              style={{ padding: 12, marginBottom: 8, borderRadius: 10, backgroundColor: "rgba(79,26,29,0.06)" }}
            >
              <Text style={{ fontWeight: "700" }}>{t.title}</Text>
              <Text style={{ fontSize: 12, color: colors.ink.muted }}>{t.moduleCode} · {t.status}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 20, gap: 12 }}>
        {modules.map(({ module, delegation }) => (
          <View key={module.id} style={{ gap: 8 }}>
            {delegation ? <DelegationBadge delegateType={delegation.delegateType} /> : null}
            <ModuleCard
              code={module.moduleCode}
              name={module.moduleName}
              meta={module.classCode}
              onPress={() => router.push(`/lecturer/create-session/${module.id}` as never)}
            />
            {module.activeSessionId ? (
              <Pressable
                onPress={() => router.push(`/lecturer/active-session/${module.activeSessionId}` as never)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.palette.accent,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>Open live session</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {modules.length === 0 ? (
          <Text style={{ color: colors.ink.muted }}>No active tutor delegations. Ask your lecturer to grant access.</Text>
        ) : null}
      </View>
    </ScreenShell>
  );
}
