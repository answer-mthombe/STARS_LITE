import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppButton } from "@/components/ui/AppButton";
import { AppInput } from "@/components/ui/AppInput";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { InnovationLabFooter } from "@/components/ui/InnovationLabFooter";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { UserRole } from "@/types/roles";
import { INSTITUTION_ROLES } from "@/types/roles";
import { DEMO_LOGIN_PRESETS } from "@/constants/demoLogins";

const ROLE_DEFAULT_EMAIL: Record<UserRole, string> = {
  student: "22001234@live.mut.ac.za",
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <StarsWordmark />
        </View>

        <View style={{ flex: 1, justifyContent: "center", minHeight: 420 }}>
          <Text style={{ color: colors.palette.accent, fontSize: 26, fontWeight: "800" }}>Sign in</Text>
          <Text style={{ color: colors.ink.muted, marginTop: 8 }}>{hint}</Text>

          <View style={{ marginTop: 18, gap: 12 }}>
            <Text style={{ color: colors.palette.primary, fontWeight: "800", marginBottom: 4 }}>Role</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {INSTITUTION_ROLES.map((r) => {
                const active = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRole(r);
                      setEmail(ROLE_DEFAULT_EMAIL[r]);
                      setPassword("password");
                    }}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 9999,
                      backgroundColor: active ? colors.palette.accent : "rgba(0,98,129,0.10)",
                      borderWidth: 1,
                      borderColor: colors.palette.accent,
                    }}
                  >
                    <Text style={{ color: active ? colors.ink.inverse : colors.palette.accent, fontWeight: "800", textTransform: "capitalize" }}>
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

            <Text style={{ color: colors.palette.primary, fontWeight: "800", marginTop: 8, marginBottom: 6 }}>
              Quick demo (password: password)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {DEMO_LOGIN_PRESETS.map((p) => (
                <Pressable
                  key={`${p.role}-${p.email}`}
                  onPress={() => {
                    setRole(p.role);
                    setEmail(p.email);
                    setPassword("password");
                  }}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: "rgba(79,26,29,0.08)",
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                  }}
                >
                  <Text style={{ color: colors.ink.default, fontSize: 11, fontWeight: "700" }} numberOfLines={2}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <AppButton
              title={busy ? "Signing in…" : "Sign in"}
              disabled={busy}
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

            <Pressable onPress={() => router.push("/register-student")} style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.palette.primary, fontWeight: "700" }}>Create a student account</Text>
            </Pressable>
          </View>
        </View>

        <InnovationLabFooter />
      </ScrollView>
    </SafeAreaView>
  );
}
