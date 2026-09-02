import { useCallback, useEffect, useMemo, useState } from "react";

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
import { testInvigilationRepository } from "@/services/supabase/testInvigilationRepository";
import { View } from "react-native";

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
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState<any[]>([])
  const [session, setSession] = useState<any>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  // const session = useMemo(() => {
  //   mockDB.touch();
  //   return testInvigilationService.getSession(testSessionId);
  // }, [testSessionId, v]);

  //const marks = useMemo(() => testInvigilationService.getMarks(testSessionId), [testSessionId, v]);

useEffect(() => {
    async function loadLiveSession() {
      setLoading(true);
      const liveSession = await testInvigilationRepository.getSession(testSessionId);
      if (liveSession) setSession(liveSession);

      const liveMarks = await testInvigilationRepository.getMarks(testSessionId);
      setMarks(liveMarks);
      setLoading(false);
    }
    loadLiveSession();
  }, [testSessionId]);

 // const myInvigilator = session?.invigilators.find((i) => i.personId === personId);
  //const canScan = session?.status === "active" && (myInvigilator?.canScan ?? false);
  const canScan = session?.status === "active" && (isLecturer || role === "tutor");

  // const markStudent = useCallback(
  //   (payload: string, method: "barcode" | "manual") => {
  //     if (!canScan) return;
  //     const res = testInvigilationService.markStudent({
  //       testSessionId,
  //       markedByPersonId: personId,
  //       markedByRole: role,
  //       barcodeOrNumber: payload,
  //       method,
  //     });
  //     if (res.ok) {
  //       show({ type: "success", title: "Marked present", message: res.mark.fullName });
  //       setManual("");
  //     } else if (!res.duplicate) {
  //       show({ type: "error", title: "Not marked", message: res.reason });
  //     }
  //   },
  //   [canScan, testSessionId, personId, role, show]
  // );

  // if (!session) {
  //   return <AppText variant="body">Test session not found.</AppText>;
  // }

  const markStudent = useCallback(
    async (payload: string, method: "barcode" | "manual") => {
      if (!canScan) return;
      setBusy(true);
      
      const res = await testInvigilationRepository.markStudent({
        testSessionId,
        studentNumber: payload,
        tutorId: role === "tutor" ? personId : undefined, // <-- Added accountability tracking
      });

      if (res.ok) {
        show({ type: "success", title: "Marked present", message: res.mark.fullName });
        setManual("");
        
        // Instantly add the student to the UI list so you don't have to reload
        setMarks((prev) => [
          {
            id: res.mark.id,
            studentNumber: payload,
            fullName: res.mark.fullName,
            timestamp: res.mark.timestamp || new Date().toISOString(),
          },
          ...prev,
        ]);
      } else if (res.duplicate) {
        show({ type: "info", title: "Already marked", message: "Student is already in the register." });
      } else {
        show({ type: "error", title: "Not marked", message: res.reason });
      }
      setBusy(false);
    },
    [canScan, testSessionId,personId, role, show]
  );

  const checkoutStudent = useCallback(
    async (studentNumber: string) => {
      if (!canScan) return;
      setCheckoutBusy(studentNumber);
      
      const res = await testInvigilationRepository.checkoutStudent({
        testSessionId,
        studentNumber,
      });

      if (res.ok) {
        show({ type: "success", title: "Checked out", message: `${studentNumber} has submitted their exam.` });
        
        // Update the UI list to reflect the new status
        setMarks((prev) => 
          prev.map((m) => 
            m.studentNumber === studentNumber 
              ? { ...m, status: "submitted" } 
              : m
          )
        );
      } else {
        show({ type: "error", title: "Checkout failed", message: res.reason });
      }
      setCheckoutBusy(null);
    },
    [canScan, testSessionId, show]
  );

  if (loading) {
    return <AppText variant="body">Loading live session...</AppText>;
  }

  if (!session) {
    return <AppText variant="body">Test session not found in database.</AppText>;
  }

  return (
    <Stack gap="lg">
      <AppCard>
        <AppText variant="heading">{session.title}</AppText>
        <AppText variant="body" style={{ marginTop: 4 }}>
          {session.moduleCode} · {session.status}
        </AppText>
        <AppText variant="body" style={{ marginTop: 8 }}>
          Present: {marks.length} · Live Supabase Database Sync
        </AppText>
      </AppCard>

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
            editable={!busy}
          />
          <AppButton 
            title={busy ? "Marking..." : "Mark present"} 
            onPress={() => manual.trim() && markStudent(manual.trim(), "manual")} 
            disabled={busy || !manual.trim()}
          />
        </Stack>
      ) : session.status === "closed" ? (
        <AppButton title="View / share PDF register" onPress={() => onRegisterReady?.(session.id)} />
      ) : (
        <AppText variant="body">Scanning disabled.</AppText>
      )}

      <Stack gap="xs">
        <SectionHeader title={`Marked (${marks.length})`} />
        {marks.length === 0 ? (
          <AppText variant="caption" style={{ opacity: 0.7 }}>No students marked present yet.</AppText>
        ) : null}
        
      {marks.map((m) => (
          <View key={m.id} style={{ marginBottom: 8 }}>
            <AppCard padded>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Stack gap="xs">
                  <AppText variant="label">{m.studentNumber}</AppText>
                  <AppText variant="caption">{m.fullName}</AppText>
                  <Chip 
                    label={m.status === "submitted" ? "Submitted" : "Seated"} 
                    variant={m.status === "submitted" ? "outline" : "accent"} 
                  />
                </Stack>
                
                {m.status !== "submitted" && canScan ? (
                  <AppButton
                    title={checkoutBusy === m.studentNumber ? "..." : "Checkout"}
                    variant="outline"
                    disabled={checkoutBusy !== null}
                    onPress={() => checkoutStudent(m.studentNumber)}
                  />
                ) : null}
              </View>
            </AppCard>
          </View>
        ))}
      </Stack>
      {isLecturer && session.status === "active" ? (
        <AppButton
          title={busy ? "Closing session..." : "End Test & Lock Register"}
          variant="outline"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            const res = await testInvigilationRepository.endTestSession(testSessionId, session.lecturerId);
            if (res.ok) {
              show({ type: "success", title: "Test closed", message: "Scanning is now locked." });
              // Force the UI to reflect the closed status
              setSession({ ...session, status: "closed" });
            } else {
              show({ type: "error", title: "Failed to close", message: res.reason });
            }
            setBusy(false);
          }}
        />
      ) : null}
    </Stack>
  );

  // return (
  //   <Stack gap="lg">
  //     <AppCard>
  //       <AppText variant="heading">{session.title}</AppText>
  //       <AppText variant="body" style={{ marginTop: 4 }}>
  //         {session.moduleCode} · {session.status}
  //       </AppText>
  //       <AppText variant="body" style={{ marginTop: 8 }}>
  //         Present: {marks.length} · Invigilators share one register (no duplicates)
  //       </AppText>
  //       {myInvigilator ? (
  //         <AppText variant="caption" style={{ marginTop: 6 }}>
  //           Your station: {myInvigilator.scanSide} · Scanning {myInvigilator.canScan ? "on" : "off"}
  //         </AppText>
  //       ) : null}
  //     </AppCard>

  //     {isLecturer && session.status === "active" ? (
  //       <Stack gap="sm">
  //         <SectionHeader title="Delegate scanning" />
  //         {session.invigilators
  //           .filter((i) => i.role === "tutor")
  //           .map((inv) => (
  //             <Chip
  //               key={inv.personId}
  //               label={`${inv.fullName} — ${inv.canScan ? "Can scan" : "Paused"}`}
  //               variant={inv.canScan ? "accent" : "outline"}
  //               onPress={() =>
  //                 testInvigilationService.setInvigilatorCanScan(
  //                   testSessionId,
  //                   inv.personId,
  //                   !inv.canScan,
  //                   session.lecturerId
  //                 )
  //               }
  //             />
  //           ))}
  //       </Stack>
  //     ) : null}

  //     {canScan ? (
  //       <Stack gap="md">
  //         <StudentCardScanner
  //           onScan={(data) => markStudent(data, "barcode")}
  //           hint="Scan student card barcode (MUT:studentNumber)"
  //         />
  //         <AppInput
  //           label="Or enter student number"
  //           value={manual}
  //           onChangeText={setManual}
  //           keyboardType="number-pad"
  //         />
  //         <AppButton title="Mark present" onPress={() => manual.trim() && markStudent(manual.trim(), "manual")} />
  //       </Stack>
  //     ) : session.status === "closed" && session.registerId ? (
  //       <AppButton title="View / share PDF register" onPress={() => onRegisterReady?.(session.registerId!)} />
  //     ) : (
  //       <AppText variant="body">
  //         {session.status === "awaiting_lecturer_confirm"
  //           ? "Waiting for lecturer to confirm test is over."
  //           : "Scanning disabled for your role."}
  //       </AppText>
  //     )}

  //     <Stack gap="xs">
  //       <SectionHeader title={`Marked (${marks.length})`} />
  //       {marks.map((m) => (
  //         <AppText key={m.id} variant="caption">
  //           {m.studentNumber} {m.fullName}
  //         </AppText>
  //       ))}
  //     </Stack>

  //     {isLecturer && session.status === "active" ? (
  //       <AppButton
  //         title="End scanning (await confirm)"
  //         variant="outline"
  //         onPress={() => {
  //           testInvigilationService.endTestScanning(testSessionId, session.lecturerId);
  //           show({ type: "success", title: "Scanning closed" });
  //         }}
  //       />
  //     ) : null}

  //     {isLecturer && session.status === "awaiting_lecturer_confirm" ? (
  //       <AppButton
  //         title={busy ? "Generating register…" : "Confirm test over & generate PDF"}
  //         disabled={busy}
  //         onPress={async () => {
  //           setBusy(true);
  //           try {
  //             const reg = await testInvigilationService.confirmTestComplete(testSessionId, session.lecturerId);
  //             show({ type: "success", title: "Register ready for tutors" });
  //             onRegisterReady?.(reg.id);
  //           } catch (e) {
  //             show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "" });
  //           } finally {
  //             setBusy(false);
  //           }
  //         }}
  //       />
  //     ) : null}
  //   </Stack>
  // );
}
