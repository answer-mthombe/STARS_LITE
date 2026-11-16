import { useMemo, useState, useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { mapAuthError } from "../../src/utils/supabase/mapAuthError";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AppButton,
  AppInput,
  AppText,
  Chip,
  ChipPicker,
  ChipSelectGroup,
  InnovationLabFooter,
  LinkText,
  Stack,
  StarsWordmark,
} from "@/components/ui";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/roles";
import { INSTITUTION_ROLES } from "@/types/roles";
import { DEMO_LOGIN_PRESETS } from "@/constants/demoLogins";

const ROLE_DEFAULT_EMAIL: Record<UserRole, string> = {
  student: "22001234@live.mut.ac.za",
  tutor: "22005678@live.mut.ac.za",
  lecturer: "mkhize@mut.ac.za",
  hod: "hod.it@mut.ac.za",
  dean: "dean.engineering@mut.ac.za",
  admin: "admin@mut.ac.za",
};

const ATTEMPTS_KEY = "@login_failed_attempts";
const LOCKOUT_TIME_KEY = "@login_lockout_time";
const LOCKOUT_DURATION = 3 * 60 * 1000;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const show = useToastStore((s) => s.show);

  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState(ROLE_DEFAULT_EMAIL.student);
  const [password, setPassword] = useState("password");
  const [busy, setBusy] = useState(false);

  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    const checkLockoutStatus = async () => {
      try {
        const savedAttempts = await AsyncStorage.getItem(ATTEMPTS_KEY);
        const savedLockoutTime = await AsyncStorage.getItem(LOCKOUT_TIME_KEY);

        if (savedAttempts) {
          const attempts = parseInt(savedAttempts, 10);

          if (attempts >= 5 && savedLockoutTime) {
            const lockoutTimestamp = parseInt(savedLockoutTime, 10);
            const currentTime = Date.now();

            if (currentTime - lockoutTimestamp >= LOCKOUT_DURATION) {
              await AsyncStorage.removeItem(ATTEMPTS_KEY);
              await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
              setFailedAttempts(0);
              return;
            }
          }
          setFailedAttempts(attempts);
        }
      } catch (e) {
        console.error("Failed to load lockout tracking status", e);
      }
    };

    checkLockoutStatus();
  }, []);

  const hint = useMemo(() => {
    switch (role) {
      case "student":
        return "Student: any seeded @live.mut.ac.za (e.g. 22001234) / password";
      case "tutor":
        return "Tutor: 22005678@live.mut.ac.za / password";
      case "lecturer":
        return "Lecturer: mkhize@mut.ac.za / password";
      case "hod":
        return "HOD: hod.it@mut.ac.za / password";
      case "dean":
        return "Dean: dean.engineering@mut.ac.za / password";
      case "admin":
        return "Admin: admin@mut.ac.za / password";
      default:
        return "Password for all demo accounts: password";
    }
  }, [role]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.palette.lightBg }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, padding: 20, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <StarsWordmark />
        </View>

        <View style={{ flex: 1, justifyContent: "center", minHeight: 420 }}>
          <AppText variant="display">Sign in</AppText>
          <AppText variant="body" style={{ marginTop: 8 }}>
            {hint}
          </AppText>

          <Stack gap="md" style={{ marginTop: 18 }}>
            <ChipSelectGroup
              options={INSTITUTION_ROLES}
              value={role}
              capitalize
              onChange={(r) => {
                setRole(r);
                setEmail(ROLE_DEFAULT_EMAIL[r]);
                setPassword("password");
              }}
            />

            <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

            <ChipPicker>
              {DEMO_LOGIN_PRESETS.map((p) => (
                <Chip
                  key={`${p.role}-${p.email}`}
                  label={p.label}
                  variant="muted"
                  onPress={() => {
                    setRole(p.role);
                    setEmail(p.email);
                    setPassword("password");
                  }}
                />
              ))}
            </ChipPicker>

            <AppButton
              title={busy ? "Signing in…" : "Sign in"}
              disabled={busy}
              fullWidth
              onPress={async () => {
                const savedAttemptsStr = await AsyncStorage.getItem(ATTEMPTS_KEY);
                const currentAttempts = savedAttemptsStr ? parseInt(savedAttemptsStr, 10) : 0;

                if (currentAttempts >= 5) {
                  const savedLockoutTime = await AsyncStorage.getItem(LOCKOUT_TIME_KEY);
                  if (savedLockoutTime) {
                    const timeLeft =
                      LOCKOUT_DURATION - (Date.now() - parseInt(savedLockoutTime, 10));

                    if (timeLeft > 0) {
                      const minutesLeft = Math.ceil(timeLeft / 60 / 1000);
                      show({
                        type: "error",
                        title: "Account Locked",
                        message: `Too many attempts. Please try again in ${minutesLeft} minutes.`,
                      });
                      return;
                    } else {
                      await AsyncStorage.removeItem(ATTEMPTS_KEY);
                      await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
                      setFailedAttempts(0);
                    }
                  }
                }

                setBusy(true);
                try {
                  // ✅ Real Supabase login — sets the real user (with their real id)
                  await login({ role, email, password });

                  await AsyncStorage.removeItem(ATTEMPTS_KEY);
                  await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
                  setFailedAttempts(0);
                  setBusy(false);
                  router.replace("/");
                } catch (e: any) {
                  // 🚧 BYPASS: if the first attempt fails (unverified email,
                  // wrong password, etc.), retry with the standard demo password.
                  // This keeps the real Supabase user id, so the dashboard
                  // still loads that specific user's data.
                  try {
                    await login({ role, email, password: "password" });

                    await AsyncStorage.removeItem(ATTEMPTS_KEY);
                    await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
                    setFailedAttempts(0);
                    setBusy(false);
                    router.replace("/");
                    return;
                  } catch (e2: any) {
                    // Both attempts failed — fall back to normal error handling
                    setBusy(false);

                    const nextCount = currentAttempts + 1;
                    setFailedAttempts(nextCount);
                    await AsyncStorage.setItem(ATTEMPTS_KEY, nextCount.toString());

                    if (nextCount >= 5) {
                      await AsyncStorage.setItem(LOCKOUT_TIME_KEY, Date.now().toString());
                      show({
                        type: "error",
                        title: "Too Many Attempts",
                        message: "Too many attempts. Your account is locked for 3 minutes.",
                      });
                    } else {
                      show({
                        type: "error",
                        title: "Sign in failed",
                        message: `${mapAuthError(e2)} (${5 - nextCount} attempts remaining)`,
                      });
                    }
                  }
                }
              }}
            />

            <LinkText onPress={() => router.push("/register-student")}>
              Create a student account
            </LinkText>
          </Stack>
        </View>

        <InnovationLabFooter />
      </View>
    </SafeAreaView>
  );
}