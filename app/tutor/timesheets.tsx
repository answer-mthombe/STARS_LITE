import { useMemo } from "react";
import { Text, View } from "react-native";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuthStore } from "@/store/authStore";
import { tutorPayrollService } from "@/services/tutorPayrollService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { useToastStore } from "@/store/toastStore";
import { colors } from "@/theme";

export default function TutorTimesheetsScreen() {
  useRoleGuard("tutor");
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);
  const show = useToastStore((s) => s.show);

  const { pending, total } = useMemo(() => {
    if (!user || user.role !== "tutor") return { pending: [], total: 0 };
    return {
      pending: tutorPayrollService.listPending(user.studentId),
      total: tutorPayrollService.totalHours(user.studentId),
    };
  }, [user, v]);

  if (!user || user.role !== "tutor") return null;

  return (
    <ScreenShell
      title="Timesheets"
      showBack
      subtitle="Senior student tutors — submit hours for institutional payment"
    >
      <AppCard>
        <Text style={{ color: colors.ink.muted }}>Total logged hours</Text>
        <Text style={{ fontSize: 28, fontWeight: "900", color: colors.palette.primary }}>{total.toFixed(2)}h</Text>
      </AppCard>
      <Text style={{ fontWeight: "800", color: colors.palette.accent, marginTop: 20, marginBottom: 10 }}>
        Submit to institution
      </Text>
      {pending.length === 0 ? (
        <Text style={{ color: colors.ink.muted }}>No pending timesheets.</Text>
      ) : (
        pending.map((t) => (
          <View key={t.id} style={{ marginBottom: 12 }}>
            <AppCard>
              <Text style={{ fontWeight: "700" }}>{t.moduleCode} · {t.workType}</Text>
              <Text style={{ color: colors.ink.muted, marginTop: 4 }}>
                {t.hoursWorked}h · {new Date(t.startedAt).toLocaleDateString()}
              </Text>
              <View style={{ height: 10 }} />
              <AppButton
                title="Submit timesheet"
                variant="outline"
                onPress={() => {
                  tutorPayrollService.submitTimesheet(t.id, user.studentId);
                  show({ type: "success", title: "Submitted for payroll" });
                }}
              />
            </AppCard>
          </View>
        ))
      )}
    </ScreenShell>
  );
}
