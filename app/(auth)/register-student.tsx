import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { useToastStore } from "@/store/toastStore";

export default function RegisterStudentScreen() {
  const router = useRouter();
  const registerStudent = useAuthStore((s) => s.registerStudent);
  const show = useToastStore((s) => s.show);

  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("password");
  const [facultyId, setFacultyId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [busy, setBusy] = useState(false);

  const faculties = useMemo(() => mockDB.list("faculties"), []);
  const courses = useMemo(() => mockDB.list("courses").filter((c) => !facultyId || c.facultyId === facultyId), [facultyId]);

  return (
    <ScreenShell title="Create account" subtitle="STARS — student registration (simulation)" showBack>
      <View style={{ alignItems: "center", marginBottom: 14 }}>
        <StarsWordmark />
      </View>
      <AppInput label="Full name" value={fullName} onChangeText={setFullName} />
      <View style={{ height: 10 }} />
      <AppInput label="Student number" value={studentNumber} onChangeText={setStudentNumber} />
      <View style={{ height: 10 }} />
      <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <View style={{ height: 14 }} />
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Gender</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {(["female", "male", "other"] as const).map((g) => (
          <Pressable
            key={g}
            onPress={() => setGender(g)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: colors.palette.accent,
              backgroundColor: gender === g ? colors.palette.accent : "transparent",
            }}
          >
            <Text style={{ color: gender === g ? colors.ink.inverse : colors.palette.accent, fontWeight: "900" }}>{g}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 16 }} />
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Faculty</Text>
      <View style={{ gap: 8 }}>
        {faculties.map((f) => (
          <Pressable key={f.id} onPress={() => { setFacultyId(f.id); setCourseId(""); }} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: facultyId === f.id ? colors.palette.primary : colors.palette.accent }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{f.facultyName}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 16 }} />
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Course</Text>
      <View style={{ gap: 8 }}>
        {courses.map((c) => (
          <Pressable key={c.id} onPress={() => setCourseId(c.id)} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: courseId === c.id ? colors.palette.primary : colors.palette.accent }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{c.courseName}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 18 }} />
      <AppButton
        title={busy ? "Creating…" : "Create account"}
        disabled={busy || !fullName.trim() || !studentNumber.trim() || !facultyId || !courseId}
        onPress={async () => {
          setBusy(true);
          try {
            await registerStudent({ fullName, studentNumber, gender, facultyId, courseId, password });
            router.replace("/student/dashboard");
          } catch (e) {
            show({ type: "error", title: "Registration failed", message: e instanceof Error ? e.message : "Try again." });
          } finally {
            setBusy(false);
          }
        }}
      />
    </ScreenShell>
  );
}
