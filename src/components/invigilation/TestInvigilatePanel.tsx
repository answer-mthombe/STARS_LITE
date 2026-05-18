import { useCallback, useMemo, useState } from "react";

import { StudentCardScanner } from "@/components/invigilation/StudentCardScanner";
import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Chip,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { testInvigilationService } from "@/services/testInvigilationService";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { useToastStore } from "@/store/toastStore";

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
    return <AppText variant="body">Test session not found.</AppText>;
  }

  return (
    <Stack gap="lg">
      <AppCard>
        <AppText variant="heading">{session.title}</AppText>
        <AppText variant="body" style={{ marginTop: 4 }}>
          {session.moduleCode} · {session.status}
        </AppText>
        <AppText variant="body" style={{ marginTop: 8 }}>
          Present: {marks.length} · Invigilators share one register (no duplicates)
        </AppText>
        {myInvigilator ? (
          <AppText variant="caption" style={{ marginTop: 6 }}>
            Your station: {myInvigilator.scanSide} · Scanning {myInvigilator.canScan ? "on" : "off"}
          </AppText>
        ) : null}
      </AppCard>

      {isLecturer && session.status === "active" ? (
        <Stack gap="sm">
          <SectionHeader title="Delegate scanning" />
          {session.invigilators
            .filter((i) => i.role === "tutor")
            .map((inv) => (
              <Chip
                key={inv.personId}
                label={`${inv.fullName} — ${inv.canScan ? "Can scan" : "Paused"}`}
                variant={inv.canScan ? "accent" : "outline"}
                onPress={() =>
                  testInvigilationService.setInvigilatorCanScan(
                    testSessionId,
                    inv.personId,
                    !inv.canScan,
                    session.lecturerId
                  )
                }
              />
            ))}
        </Stack>
      ) : null}

      {canScan ? (
        <Stack gap="md">
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
        </Stack>
      ) : session.status === "closed" && session.registerId ? (
        <AppButton title="View / share PDF register" onPress={() => onRegisterReady?.(session.registerId!)} />
      ) : (
        <AppText variant="body">
          {session.status === "awaiting_lecturer_confirm"
            ? "Waiting for lecturer to confirm test is over."
            : "Scanning disabled for your role."}
        </AppText>
      )}

      <Stack gap="xs">
        <SectionHeader title={`Marked (${marks.length})`} />
        {marks.map((m) => (
          <AppText key={m.id} variant="caption">
            {m.studentNumber} {m.fullName}
          </AppText>
        ))}
      </Stack>

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
    </Stack>
  );
}
