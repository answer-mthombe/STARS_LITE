import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { StudentCardScanner } from "@/components/invigilation/StudentCardScanner";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { testInvigilationService } from "@/services/testInvigilationService";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { useToastStore } from "@/store/toastStore";
import { colors } from "@/theme";
type Props = {
  testSessionId: string;
  personId: string;
  role: "lecturer" | "tutor";
  isLecturer: boolean;
  onRegisterReady?: (registerId: string) => void;
};

export function TestInvigilatePanel({ testSessionId, personId, role, isLecturer, onRegisterReady }: Props) {
  const v = useMockDbVersionStore((s) => s.version);
  const show = useToastStore((s) => s.show);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  const session = useMemo(() => {
    mockDB.touch();
    return testInvigilationService.getSession(testSessionId);
  }, [testSessionId, v]);

  const marks = useMemo(() => testInvigilationService.getMarks(testSessionId), [testSessionId, v]);

  const myInvigilator = session?.invigilators.find((i) => i.personId === personId);
  const canScan = session?.status === "active" && (myInvigilator?.canScan ?? false);

  const markStudent = useCallback(
    (payload: string, method: "barcode" | "manual") => {
      if (!canScan) return;
      const res = testInvigilationService.markStudent({
        testSessionId,
        markedByPersonId: personId,
        markedByRole: role,
        barcodeOrNumber: payload,
        method,
      });
      if (res.ok) {
        show({ type: "success", title: "Marked present", message: res.mark.fullName });
        setManual("");
      } else if (!res.duplicate) {
        show({ type: "error", title: "Not marked", message: res.reason });
      }
    },
    [canScan, testSessionId, personId, role, show]
  );

  if (!session) {
    return <Text style={{ color: colors.ink.muted }}>Test session not found.</Text>;
  }

  return (
    <View style={{ gap: 16 }}>
      <AppCard>
        <Text style={{ fontWeight: "800", color: colors.palette.primary }}>{session.title}</Text>
        <Text style={{ color: colors.ink.muted, marginTop: 4 }}>{session.moduleCode} · {session.status}</Text>
        <Text style={{ color: colors.ink.muted, marginTop: 8 }}>
          Present: {marks.length} · Invigilators share one register (no duplicates)
        </Text>
        {myInvigilator ? (
          <Text style={{ color: colors.ink.subtle, marginTop: 6, fontSize: 12 }}>
            Your station: {myInvigilator.scanSide} · Scanning {myInvigilator.canScan ? "on" : "off"}
          </Text>
        ) : null}
      </AppCard>

      {isLecturer && session.status === "active" ? (
        <View>
          <Text style={{ fontWeight: "800", color: colors.palette.primary, marginBottom: 8 }}>Delegate scanning</Text>
          {session.invigilators
            .filter((i) => i.role === "tutor")
            .map((inv) => (
              <Pressable
                key={inv.personId}
                onPress={() =>
                  testInvigilationService.setInvigilatorCanScan(
                    testSessionId,
                    inv.personId,
                    !inv.canScan,
                    session.lecturerId
                  )
                }
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  padding: 10,
                  marginBottom: 6,
                  borderRadius: 8,
                  backgroundColor: inv.canScan ? "rgba(0,98,129,0.1)" : colors.surface.base,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                }}
              >
                <Text style={{ fontWeight: "600" }}>{inv.fullName}</Text>
                <Text style={{ color: colors.palette.accent }}>{inv.canScan ? "Can scan" : "Paused"}</Text>
              </Pressable>
            ))}
        </View>
      ) : null}

      {canScan ? (
        <>
          <StudentCardScanner
            onScan={(data) => markStudent(data, "barcode")}
            hint="Scan student card barcode (MUT:studentNumber)"
          />
          <AppInput
            label="Or enter student number"
            value={manual}
            onChangeText={setManual}
            keyboardType="number-pad"
          />
          <AppButton title="Mark present" onPress={() => manual.trim() && markStudent(manual.trim(), "manual")} />
        </>
      ) : session.status === "closed" && session.registerId ? (
        <AppButton
          title="View / share PDF register"
          onPress={() => onRegisterReady?.(session.registerId!)}
        />
      ) : (
        <Text style={{ color: colors.ink.muted }}>
          {session.status === "awaiting_lecturer_confirm"
            ? "Waiting for lecturer to confirm test is over."
            : "Scanning disabled for your role."}
        </Text>
      )}

      <View>
        <Text style={{ fontWeight: "800", marginBottom: 8 }}>Marked ({marks.length})</Text>
        {marks.map((m) => (
          <Text key={m.id} style={{ fontSize: 13, color: colors.ink.default, marginBottom: 4 }}>
            {m.studentNumber} {m.fullName}
          </Text>
        ))}
      </View>

      {isLecturer && session.status === "active" ? (
        <AppButton
          title="End scanning (await confirm)"
          variant="outline"
          onPress={() => {
            testInvigilationService.endTestScanning(testSessionId, session.lecturerId);
            show({ type: "success", title: "Scanning closed" });
          }}
        />
      ) : null}

      {isLecturer && session.status === "awaiting_lecturer_confirm" ? (
        <AppButton
          title={busy ? "Generating register…" : "Confirm test over & generate PDF"}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const reg = await testInvigilationService.confirmTestComplete(testSessionId, session.lecturerId);
              show({ type: "success", title: "Register ready for tutors" });
              onRegisterReady?.(reg.id);
            } catch (e) {
              show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "" });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}
