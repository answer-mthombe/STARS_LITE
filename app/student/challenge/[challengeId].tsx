import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { colors } from "@/theme";
import { attendanceChallengeService } from "@/services/attendanceChallengeService";
import { AttendanceChallengeGrid } from "@/components/attendance/AttendanceChallengeGrid";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";

export default function StudentAttendanceChallengeScreen() {
  const { challengeId } = useLocalSearchParams() as { challengeId: string };
  const router = useRouter();
  const show = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);
  const [taps, setTaps] = useState<Record<number, number>>({});
  const [polls, setPolls] = useState<Array<{ latitude: number; longitude: number; accuracyMeters?: number; capturedAtMs: number }>>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const chal = useMemo(() => attendanceChallengeService.get(String(challengeId)), [challengeId]);

  useEffect(() => {
    if (!chal) return;
    let cancelled = false;
    async function startPolling() {
      // Initial poll immediately (T+0)
      try {
        const loc = await captureLocationOnce();
        if (!cancelled) setPolls((p) => [...p, { ...loc, capturedAtMs: Date.now() }]);
      } catch {
        // ignore; submit will fail if too many missing
      }
      timer.current = setInterval(() => {
        void (async () => {
          try {
            const loc = await captureLocationOnce();
            if (!cancelled) setPolls((p) => [...p, { ...loc, capturedAtMs: Date.now() }]);
          } catch {
            if (!cancelled) setPolls((p) => [...p, { latitude: NaN as any, longitude: NaN as any, capturedAtMs: Date.now() } as any]);
          }
        })();
      }, attendanceChallengeService.gpsPollMs);
    }
    void startPolling();
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [chal]);

  if (!chal) {
    return (
      <ScreenShell title="Attendance challenge" showBack>
        <Text style={{ color: colors.ink.muted, lineHeight: 22 }}>
          This challenge is no longer available. Go back and open the challenge again.
        </Text>
      </ScreenShell>
    );
  }

  const target = chal.objects[chal.targetIndex]!;
  const instruction = `Tap the ${target.size.toUpperCase()} ${target.color.toUpperCase()} ${target.shape.toUpperCase()} ${chal.requiredTaps} times`;

  const totalTaps = Object.values(taps).reduce((a, n) => a + n, 0);

  const submit = async () => {
    setBusy(true);
    try {
      // The student selects a single cell; we interpret the highest-tapped cell as the intended answer.
      const entries = Object.entries(taps).map(([k, v]) => ({ idx: Number(k), count: v }));
      entries.sort((a, b) => b.count - a.count);
      const top = entries[0];
      if (!top) {
        show({ type: "info", title: "Select an object", message: "Tap the correct object to answer." });
        return;
      }
      const res = await attendanceChallengeService.submit({
        challengeId: chal.id,
        tappedIndex: top.idx,
        tapCount: top.count,
        gpsPolls: polls,
      });
      if (!res.ok) {
        show({ type: "error", title: "Not recorded", message: res.reason });
        return;
      }
      show({ type: "success", title: "Attendance recorded" });
      router.replace("/student/attendance-history");
    } catch (e) {
      show({ type: "error", title: "Error", message: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell title="Attendance challenge" subtitle="All gates must be green at submit" showBack>
      <Text style={{ color: colors.ink.default, fontWeight: "900", lineHeight: 22 }}>{instruction}</Text>
      <Text style={{ color: colors.ink.muted, marginTop: 10, lineHeight: 20 }}>
        GPS is checked continuously for ~{attendanceChallengeService.windowMs / 1000}s. If you leave the radius, nothing is recorded.
      </Text>
      <View style={{ height: 16 }} />
      <AttendanceChallengeGrid
        objects={chal.objects}
        disabled={busy}
        onPressCell={(idx) => setTaps((t) => ({ ...t, [idx]: (t[idx] ?? 0) + 1 }))}
      />
      <View style={{ height: 14 }} />
      <Text style={{ color: colors.ink.muted }}>Taps recorded: {totalTaps}</Text>
      <View style={{ height: 14 }} />
      <AppButton title={busy ? "Verifying…" : "Submit"} disabled={busy} onPress={() => void submit()} />
    </ScreenShell>
  );
}

