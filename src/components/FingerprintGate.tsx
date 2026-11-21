import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton, AppText, StarsWordmark } from "@/components/ui";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useAppLockStore } from "@/store/appLockStore";
import {
  checkFingerprintAvailability,
  getFingerprintEnrolled,
  promptFingerprint,
  registerFingerprintNow,
} from "@/services/biometricService";

/**
 * Full-screen lock shown over the app whenever a signed-in STUDENT opens the app.
 * It asks for the fingerprint automatically; the student only reaches the
 * dashboard (and Join class) after the phone confirms the fingerprint.
 *
 * It does not appear right after sign-up or sign-in, because the student has
 * just proved who they are in this same app run.
 */
export function FingerprintGate() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const decided = useAppLockStore((s) => s.decided);
  const unlocked = useAppLockStore((s) => s.unlocked);
  const decide = useAppLockStore((s) => s.decide);
  const unlock = useAppLockStore((s) => s.unlock);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsRegister, setNeedsRegister] = useState(false);
  const runningRef = useRef(false);

  const isStudent = user?.role === "student";
  // Locked from the very first render after the app loads, so the dashboard never flashes.
  const locked = status === "ready" && isStudent && (!decided || !unlocked);

  // Decide once, when we first know who (if anyone) is signed in at app start.
  useEffect(() => {
    if (status === "ready" && !decided) decide(isStudent);
  }, [status, decided, isStudent, decide]);

  // Signed out while locked: clear the lock so the next sign-in isn't blocked.
  useEffect(() => {
    if (decided && !user && !unlocked) unlock();
  }, [decided, user, unlocked, unlock]);

  const tryUnlock = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const available = await checkFingerprintAvailability();
      if (!available.ok) {
        setMessage(available.message);
        return;
      }

      // No registration on record (e.g. it failed at sign-up) -> register first.
      // `null` means we couldn't check (offline), so just use the phone's prompt.
      const enrolled = await getFingerprintEnrolled();
      if (enrolled === false) {
        setNeedsRegister(true);
        return;
      }
      setNeedsRegister(false);

      const result = await promptFingerprint("Unlock STARS");
      if (result.ok) unlock();
      else setMessage(result.message);
    } catch {
      setMessage("Couldn't check your fingerprint. Try again.");
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, [unlock]);

  const registerNow = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const result = await registerFingerprintNow();
      if (result.ok) {
        setNeedsRegister(false);
        unlock();
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage("Couldn't register your fingerprint. Try again.");
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, [unlock]);

  // Ask for the fingerprint automatically as soon as the lock screen appears.
  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(() => {
      void tryUnlock();
    }, 400);
    return () => clearTimeout(t);
  }, [locked, tryUnlock]);

  if (!locked) return null;

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <StarsWordmark large />

          <AppText variant="heading" style={styles.title}>
            STARS is locked
          </AppText>
          <AppText variant="body" style={styles.body}>
            {needsRegister
              ? "Register your fingerprint to continue. You will use it every time you open the app."
              : "Use your fingerprint to open your student account."}
          </AppText>

          {message ? (
            <AppText variant="body" style={styles.error}>
              {message}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              title={
                needsRegister
                  ? busy
                    ? "Waiting for fingerprint…"
                    : "Register fingerprint"
                  : busy
                    ? "Waiting for fingerprint…"
                    : "Unlock with fingerprint"
              }
              variant="accent"
              size="lg"
              fullWidth
              disabled={busy}
              onPress={needsRegister ? registerNow : tryUnlock}
            />
            <View style={{ height: 10 }} />
            <AppButton title="Sign out" variant="outline" size="lg" fullWidth disabled={busy} onPress={logout} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: colors.palette.lightBg,
  },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { marginTop: 24, textAlign: "center" },
  body: { marginTop: 8, textAlign: "center", color: colors.ink.muted },
  error: { marginTop: 14, textAlign: "center", color: "#C0392B" },
  actions: { width: "100%", marginTop: 28 },
});
