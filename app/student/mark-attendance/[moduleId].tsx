import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { SessionTimer } from "@/components/ui/SessionTimer";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";
import { parseAttendanceQrPayload } from "@/utils/attendanceQr";

type Tab = "scan" | "manual";

export default function StudentMarkAttendanceScreen() {
  useRoleGuard("student");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const v = useMockDbVersionStore((s) => s.version);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>(Platform.OS === "web" ? "manual" : "scan");
  const [permission, requestPermission] = useCameraPermissions();
  const handledScan = useRef(false);

  const session = useMemo(() => {
    mockDB.touch();
    const mod = mockDB.read("modules", String(moduleId));
    if (!mod?.activeSessionId) return null;
    return mockDB.read("attendanceSessions", mod.activeSessionId);
  }, [moduleId, v]);

  const submit = useCallback(
    async (codeEntered: string): Promise<boolean> => {
      if (!session || !user || user.role !== "student") return false;
      setBusy(true);
      try {
        const loc = await captureLocationOnce();
        const res = attendanceSimulationService.markAttendance({
          sessionId: session.id,
          studentId: user.id,
          studentLat: loc.latitude,
          studentLng: loc.longitude,
          codeEntered,
        });
        if (!res.ok) {
          show({ type: "error", title: "Not recorded", message: res.reason });
          return false;
        }
        show({ type: "success", title: "Attendance recorded" });
        router.replace("/student/attendance-history");
        return true;
      } catch (e) {
        show({ type: "error", title: "Error", message: e instanceof Error ? e.message : "Try again." });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router, session, show, user]
  );

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!session || busy || handledScan.current) return;
      const parsed = parseAttendanceQrPayload(data);
      if (!parsed) {
        show({ type: "error", title: "Invalid QR", message: "Could not read this attendance QR." });
        return;
      }
      if (parsed.sessionId !== session.id) {
        show({ type: "error", title: "Wrong session", message: "This QR is not for the active class." });
        return;
      }
      if (session.moduleId !== String(moduleId)) {
        show({ type: "error", title: "Wrong module", message: "Open attendance from the correct module." });
        return;
      }
      handledScan.current = true;
      void submit(parsed.code).then((ok) => {
        if (!ok) handledScan.current = false;
      });
    },
    [busy, moduleId, session, show, submit]
  );

  return (
    <ScreenShell title="Mark attendance" subtitle="GPS check + QR or 6-digit code" showBack>
      {!session ? (
        <Text style={{ color: colors.ink.muted }}>No active session for this module.</Text>
      ) : (
        <>
          <SessionTimer expiresAtIso={session.expiresAt} />
          <Text style={{ color: colors.ink.muted, marginTop: 14, lineHeight: 22 }}>
            Radius: {session.radius}m. Code and QR rotate every 5s — match what the lecturer shows or scan the QR.
          </Text>
          <View style={{ height: 16 }} />

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            {(["scan", "manual"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  handledScan.current = false;
                  setTab(t);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: tab === t ? colors.palette.primary : colors.surface.soft,
                  borderWidth: 1,
                  borderColor: tab === t ? colors.palette.primary : colors.border.subtle,
                }}
              >
                <Text style={{ color: tab === t ? colors.ink.inverse : colors.ink.default, fontWeight: "800", fontSize: 13 }}>
                  {t === "scan" ? "Scan QR" : "Enter code"}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === "scan" && Platform.OS !== "web" ? (
            <>
              {!permission?.granted ? (
                <AppButton title={permission?.canAskAgain === false ? "Camera blocked" : "Allow camera"} onPress={() => void requestPermission()} />
              ) : (
                <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border.subtle }}>
                  <CameraView
                    style={{ width: "100%", height: 280 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={onBarcodeScanned}
                  />
                </View>
              )}
              <Text style={{ color: colors.ink.muted, marginTop: 12, fontSize: 13, lineHeight: 20 }}>
                Point at the lecturer&apos;s attendance QR. We verify GPS after a successful scan.
              </Text>
            </>
          ) : tab === "scan" && Platform.OS === "web" ? (
            <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
              QR scanning runs in the mobile app (camera). On web, use &quot;Enter code&quot; with the 6-digit code from your lecturer.
            </Text>
          ) : null}

          {tab === "manual" ? (
            <>
              <AppInput label="Attendance code" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6 digits" />
              <View style={{ height: 14 }} />
              <AppButton title={busy ? "Verifying…" : "Submit"} disabled={busy} onPress={() => void submit(code.trim()).then(() => undefined)} />
            </>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}
