import { useMemo, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { mapAuthError } from "@/utils/supabase/mapAuthError";
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

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const show = useToastStore((s) => s.show);

  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState(ROLE_DEFAULT_EMAIL.student);
  const [password, setPassword] = useState("password");
  const [busy, setBusy] = useState(false);

  const hint = useMemo(() => {
    switch (role) {
      case "student":
        return "Student: any seeded @live.mut.ac.za (e.g. 22001234) / password";
      case "tutor":
        return "Tutor (also a student): 22005678@live.mut.ac.za — module tutor for Mobile Dev / password";
      case "lecturer":
        return "Lecturer: mkhize@mut.ac.za, naidoo@mut.ac.za, dube@mut.ac.za, mahlangu@mut.ac.za / password";
      case "hod":
        return "HOD: hod.it@mut.ac.za (IT), hod.electrical@mut.ac.za, hod.business@mut.ac.za / password";
      case "dean":
        return "Dean: dean.engineering@mut.ac.za or dean.management@mut.ac.za / password";
      case "admin":
        return "Admin: admin@mut.ac.za / password";
      default:
        return "Password for all demo accounts: password";
    }
  }, [role]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.palette.lightBg }} edges={["top", "left", "right"]}>
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
            <AppText variant="heading">Role</AppText>
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

            <AppText variant="heading" style={{ marginTop: 8 }}>
              Quick demo (password: password)
            </AppText>
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
                setBusy(true);
                try {
                  await login({ role, email, password });
                  router.replace("/");
                } catch (e) {
                  show({
                    type: "error",
                    title: "Sign in failed",
                    message: e instanceof Error ? e.message : "Please try again.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />

            <LinkText onPress={() => router.push("/register-student")}>Create a student account</LinkText>
          </Stack>
        </View>

        <InnovationLabFooter />
      </View>
    </SafeAreaView>
  );
}
