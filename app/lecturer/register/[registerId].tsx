import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import { AppButton, AppText, ScreenShell, Spacer, Stack } from "@/components/ui";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { classRegisterService } from "@/services/classRegisterService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { testInvigilationRepository } from "@/services/supabase/testInvigilationRepository";
import { useToastStore } from "@/store/toastStore";

export default function ViewRegisterScreen() {
  useRoleGuard(["lecturer", "tutor", "hod", "dean", "admin"]);
  const { registerId, type } = useLocalSearchParams() as { registerId: string; type?: string };
  const show = useToastStore((s) => s.show);
  
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ kind: "class" | "test"; reg: any } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function loadRegister() {
      setLoading(true);
      try {
        if (type === "test" || type === "exam") {
          // Fetch live Supabase data for tests/exams
          const reg = await testInvigilationRepository.getTestRegisterSummary(String(registerId));
          if (isMounted) setData(reg ? { kind: "test", reg } : null);
        } else {
          // Keep existing class logic for now
          const reg = await classRegisterService.getRegister(String(registerId));
          if (isMounted) setData(reg ? { kind: "class", reg } : null);
        }
      } catch (error) {
        console.error("Failed to load register:", error);
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRegister();
    return () => { isMounted = false; };
  }, [registerId, type]);

  if (loading) {
    return (
      <ScreenShell title="Loading..." showBack>
        <AppText variant="body">Fetching official register from database...</AppText>
      </ScreenShell>
    );
  }

  if (!data || !data.reg) {
    return (
      <ScreenShell title="Register" showBack>
        <AppText variant="body">Register not found in database.</AppText>
      </ScreenShell>
    );
  }

  const title = data.kind === "class" ? `${data.reg.moduleCode} class register` : `${data.reg.moduleCode} — ${data.reg.title}`;
  const students = data.reg.students || [];
  const present = students.filter((s: any) => s.present).length;
  const total = students.length;

  const meta =
    data.kind === "class"
      ? `Tutor(s): ${data.reg.tutorNames?.join(", ") || "—"} · ${data.reg.durationMinutes} min`
      : `Invigilators: ${data.reg.invigilatorNames?.join(", ") || "None"}`;

  return (
    <ScreenShell title={title} showBack subtitle={`${present}/${total} present · ${meta}`}>
      <AppText variant="body" style={{ marginBottom: 12 }}>
        Official finalized register. Ready for PDF export.
      </AppText>
      
      <Stack gap="xs" style={{ marginBottom: 24 }}>
        {students.map((s: any) => (
          <AppText key={s.studentId} variant="bodyStrong">
            {s.present ? "✓" : "○"} {s.studentNumber} — {s.fullName} {s.status === "submitted" ? "(Submitted)" : ""}
          </AppText>
        ))}
        {students.length === 0 ? (
          <AppText variant="caption" style={{ opacity: 0.7 }}>No students marked present for this session.</AppText>
        ) : null}
      </Stack>

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
      <Spacer size="sm" />
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








// import { useEffect, useMemo, useState } from "react";
// import { useLocalSearchParams } from "expo-router";

// import { AppButton, AppText, ScreenShell, Spacer, Stack } from "@/components/ui";
// import { useRoleGuard } from "@/hooks/useRoleGuard";
// import { classRegisterService } from "@/services/classRegisterService";
// import { testInvigilationService } from "@/services/testInvigilationService";
// import { mockDB } from "@/mockDB/mockDBService";
// import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
// import { useToastStore } from "@/store/toastStore";
// import type { ClassRegisterModel } from "@/models/ClassRegister";

// export default function ViewRegisterScreen() {
//   useRoleGuard(["lecturer", "tutor", "hod", "dean", "admin"]);
//   const { registerId, type } = useLocalSearchParams() as { registerId: string; type?: string };
//   const v = useMockDbVersionStore((s) => s.version);
//   const show = useToastStore((s) => s.show);
//   const [busy, setBusy] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [data, setData] = useState<{ kind: "class" | "test"; reg: any } | null>(null);

//   // const data = useMemo(() => {
//   //   mockDB.touch();
//   //   if (type === "test") {
//   //     const reg = mockDB.read("testRegisters", String(registerId));
//   //     return reg ? { kind: "test" as const, reg } : null;
//   //   }
//   //   const reg = classRegisterService.getRegister(String(registerId));
//   //   return reg ? { kind: "class" as const, reg } : null;
//   // }, [registerId, type, v]);

// useEffect(() => {
//     let isMounted = true;
    
//     async function loadRegister() {
//       setLoading(true);
//       try {
//         if (type === "test") {
//           const reg = mockDB.read("testRegisters", String(registerId));
//           if (isMounted) setData(reg ? { kind: "test", reg } : null);
//         } else {
//           // This await is the magic key that prevents the crash!
//           const reg = await classRegisterService.getRegister(String(registerId));
//           if (isMounted) setData(reg ? { kind: "class", reg } : null);
//         }
//       } catch (error) {
//         console.error("Failed to load register:", error);
//         if (isMounted) setData(null);
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     }

//     mockDB.touch(); // keep for backward compatibility
//     loadRegister();

//     return () => { isMounted = false; };
//   }, [registerId, type, v]);

//   if (!data) {
//     return (
//       <ScreenShell title="Register" showBack>
//         <AppText variant="body">Register not found.</AppText>
//       </ScreenShell>
//     );
//   }

//   if (loading) {
//     return (
//       <ScreenShell title="Loading..." showBack>
//         <AppText variant="body">Fetching register from database...</AppText>
//       </ScreenShell>
//     );
//   }

//   if (!data || !data.reg) {
//     return (
//       <ScreenShell title="Register" showBack>
//         <AppText variant="body">Register not found.</AppText>
//       </ScreenShell>
//     );
//   }

//   const title = data.kind === "class" ? `${data.reg.moduleCode} class register` : data.reg.title;

//   // Safe fallback to empty arrays just in case, preventing filter crashes
//   const students = data.reg.students || [];
//   const tutorNames = data.reg.tutorNames || [];

//   // const present = data.reg.students.filter((s) => s.present).length;
//   // const total = data.reg.students.length;
//   const present = students.filter((s: any) => s.present).length;
//   const total = students.length;
//   const meta =
//     data.kind === "class"
//       ? `Tutor(s): ${data.reg.tutorNames.join(", ") || "—"} · ${data.reg.durationMinutes} min`
//       : `Invigilators: ${data.reg.invigilatorNames.join(", ")}`;

//   return (
//     <ScreenShell title={title} showBack subtitle={`${present}/${total} present · ${meta}`}>
//       <AppText variant="body" style={{ marginBottom: 12 }}>
//         Print-ready PDF — pre-loaded in simulator demo data.
//       </AppText>
//       <Stack gap="xs" style={{ marginBottom: 16 }}>
//         {students.map((s:any) => (
//           <AppText key={s.studentId} variant="bodyStrong">
//             {s.present ? "✓" : "○"} {s.studentNumber} — {s.fullName}
//           </AppText>
//         ))}
//       </Stack>
//       <AppButton
//         title={busy ? "Preparing…" : "Print register"}
//         onPress={async () => {
//           setBusy(true);
//           try {
//             if (data.kind === "class") {
//               await classRegisterService.printRegister(data.reg.id);
//             } else {
//               await testInvigilationService.printTestRegister(data.reg.id);
//             }
//             show({ type: "success", title: "Sent to printer" });
//           } catch (e) {
//             show({ type: "error", title: "Print failed", message: e instanceof Error ? e.message : "" });
//           } finally {
//             setBusy(false);
//           }
//         }}
//       />
//       <Spacer size="sm" />
//       <AppButton
//         title="Share PDF"
//         variant="outline"
//         disabled={busy}
//         onPress={async () => {
//           setBusy(true);
//           try {
//             if (data.kind === "class") {
//               await classRegisterService.shareRegisterPdf(data.reg.id);
//             } else {
//               await testInvigilationService.shareTestRegister(data.reg.id);
//             }
//             show({ type: "success", title: "PDF ready" });
//           } catch (e) {
//             show({
//               type: "error",
//               title: "Could not share",
//               message: e instanceof Error ? e.message : "Try again",
//             });
//           } finally {
//             setBusy(false);
//           }
//         }}
//       />
//     </ScreenShell>
//   );
// }
