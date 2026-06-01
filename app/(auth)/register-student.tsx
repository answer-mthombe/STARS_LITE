import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { StarsWordmark } from "@/components/ui/StarsWordmark";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";
import { useToastStore } from "@/store/toastStore";
import { getAllCourses } from "@/services/supabase";
import { getAllFaculties } from "@/services/supabase/facultyRepository";
import { isSupabaseEnabled } from "@/supabase/client";

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


  const [faculties, setFaculties] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  // const faculties = useMemo(() => mockDB.list("faculties"), []);
  // const courses = useMemo(() => mockDB.list("courses").filter((c) => !facultyId || c.facultyId === facultyId), [facultyId]);

useEffect(() => {
    async function loadInstitutionData() {
      setLoadingData(true);
      try {
        if (isSupabaseEnabled()) {
          // Fetch from your live Repositories!
          const [fData, cData] = await Promise.all([
            getAllFaculties(),
            getAllCourses()
          ]);

          console.log("LIVE FACULTIES:", fData);
          console.log("LIVE COURSES:", cData);
          setFaculties(fData);
          setAllCourses(cData);
        } else {
          // Fallback to mock
          setFaculties(mockDB.list("faculties"));
          setAllCourses(mockDB.list("courses"));
        }
      } catch (err) {
        console.error("Failed to load institution data:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadInstitutionData();
  }, []);

  const displayedCourses = useMemo(() => {
    return allCourses.filter((c) => {
      if (!facultyId) return true;
      // Handle both Supabase snake_case and Mock camelCase
      return c.faculty_id === facultyId || c.facultyId === facultyId;
    });
  }, [allCourses, facultyId]);

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
      {loadingData ? (
        <ActivityIndicator size="small" color={colors.palette.primary} style={{ alignSelf: "flex-start", marginVertical: 8 }} />
      ) : (
      <View style={{ gap: 8 }}>
        {faculties.map((f) => (
          <Pressable key={f.id} onPress={() => { setFacultyId(f.id); setCourseId(""); }} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: facultyId === f.id ? colors.palette.primary : colors.palette.accent }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{f.faculty_name || f.facultyName}</Text>
          </Pressable>
        ))}
      </View>
      )}
      <View style={{ height: 16 }} />
      <Text style={{ color: colors.palette.accent, fontWeight: "900", marginBottom: 8 }}>Course</Text>
      
      {/* <View style={{ gap: 8 }}>
        {courses.map((c) => (
          <Pressable key={c.id} onPress={() => setCourseId(c.id)} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: courseId === c.id ? colors.palette.primary : colors.palette.accent }}>
            <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{c.courseName}</Text>
          </Pressable>
        ))}
      </View> */}

      {loadingData ? (
         <ActivityIndicator size="small" color={colors.palette.primary} style={{ alignSelf: "flex-start", marginVertical: 8 }} />
      ) : (
        <View style={{ gap: 8 }}>
          {/* Fix: changed from 'courses.map' to 'displayedCourses.map' */}
          {displayedCourses.length === 0 && !!facultyId ? (
            <Text style={{ color: colors.palette.accent, fontStyle: "italic" }}>No courses found for this faculty.</Text>
          ) : (
            displayedCourses.map((c) => (
              <Pressable key={c.id} onPress={() => setCourseId(c.id)} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: courseId === c.id ? colors.palette.primary : colors.palette.accent }}>
                {/* Fix: Check for both snake_case and camelCase */}
                <Text style={{ color: colors.ink.default, fontWeight: "800" }}>{c.course_name || c.courseName}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

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
