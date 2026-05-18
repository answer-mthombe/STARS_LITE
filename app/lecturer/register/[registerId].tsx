import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { classRegisterService } from "@/services/classRegisterService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { colors } from "@/theme";
import { useToastStore } from "@/store/toastStore";

export default function ViewRegisterScreen() {
  useRoleGuard(["lecturer", "tutor", "hod", "dean", "admin"]);
  const { registerId, type } = useLocalSearchParams() as { registerId: string; type?: string };
  const v = useMockDbVersionStore((s) => s.version);
  const show = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const data = useMemo(() => {
    mockDB.touch();
    if (type === "test") {
      const reg = mockDB.read("testRegisters", String(registerId));
      return reg ? { kind: "test" as const, reg } : null;
    }
    const reg = classRegisterService.getRegister(String(registerId));
    return reg ? { kind: "class" as const, reg } : null;
  }, [registerId, type, v]);

  if (!data) {
    return (
      <ScreenShell title="Register" showBack>
        <Text style={{ color: colors.ink.muted }}>Register not found.</Text>
      </ScreenShell>
    );
  }

  const title = data.kind === "class" ? `${data.reg.moduleCode} class register` : data.reg.title;
  const present =
    data.kind === "class"
      ? data.reg.students.filter((s) => s.present).length
      : data.reg.students.filter((s) => s.present).length;
  const total = data.reg.students.length;
  const meta =
    data.kind === "class"
      ? `Tutor(s): ${data.reg.tutorNames.join(", ") || "—"} · ${data.reg.durationMinutes} min`
      : `Invigilators: ${data.reg.invigilatorNames.join(", ")}`;

  return (
    <ScreenShell title={title} showBack subtitle={`${present}/${total} present · ${meta}`}>
      <Text style={{ color: colors.ink.muted, marginBottom: 12, fontSize: 13 }}>
        Print-ready PDF — pre-loaded in simulator demo data.
      </Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {data.reg.students.map((s) => (
          <Text key={s.studentId} style={{ color: colors.ink.default, fontSize: 14 }}>
            {s.present ? "✓" : "○"} {s.studentNumber} — {s.fullName}
          </Text>
        ))}
      </View>
      <AppButton
        title={busy ? "Preparing…" : "Print register"}
        onPress={async () => {
          setBusy(true);
          try {
            if (data.kind === "class") {
              await classRegisterService.printRegister(data.reg.id);
            } else {
              await testInvigilationService.printTestRegister(data.reg.id);
            }
            show({ type: "success", title: "Sent to printer" });
          } catch (e) {
            show({ type: "error", title: "Print failed", message: e instanceof Error ? e.message : "" });
          } finally {
            setBusy(false);
          }
        }}
      />
      <View style={{ height: 10 }} />
      <AppButton
        title="Share PDF"
        variant="outline"
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            if (data.kind === "class") {
              await classRegisterService.shareRegisterPdf(data.reg.id);
            } else {
              await testInvigilationService.shareTestRegister(data.reg.id);
            }
            show({ type: "success", title: "PDF ready" });
          } catch (e) {
            show({
              type: "error",
              title: "Could not share",
              message: e instanceof Error ? e.message : "Try again",
            });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenShell>
  );
}
