import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { venueRepository } from "@/services/supabase/venueRepository";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppInput } from "@/components/ui/AppInput";
import { AppButton } from "@/components/ui/AppButton";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { testInvigilationService } from "@/services/testInvigilationService";
import { useToastStore } from "@/store/toastStore";
import { colors } from "@/theme";
import { testInvigilationRepository } from "@/services/supabase/testInvigilationRepository";
import { getModuleById } from "@/services/supabase/moduleRepository"; // Adjust path as needed
import type { ModuleModel } from "@/models/Module";

export default function StartTestSessionScreen() {
  useRoleGuard("lecturer");
  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [title, setTitle] = useState("Test 1");
  const [sessionType, setSessionType] = useState<"test" | "exam">("test");
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
const [tutorCandidates, setTutorCandidates] = useState<{ studentId: string; name: string }[]>([]);
const [mod, setMod] = useState<{ id: string; moduleName: string } | null>(null);

 // const mod = useMemo(() => mockDB.read("modules", String(moduleId)), [moduleId]);

  // const tutorCandidates = useMemo(() => {
  //   return mockDB.list("tutors").map((t) => ({
  //     studentId: t.studentId,
  //     name: t.fullName,
  //   }));
  // }, []);


useEffect(() => {
    async function loadModule() {
      if (!moduleId) return;
      
      // 1. Try fetching from Supabase first
      try {
        const fetchedMod = await getModuleById(String(moduleId));
        if (fetchedMod) {
          setMod({ 
            id: fetchedMod.id, 
            moduleName:  fetchedMod.moduleName 
          });
          return; // Exit early if Supabase succeeds
        }
      } catch (e) {
        console.log("Supabase module fetch failed, falling back to mockDB:", e);
      }

      // 2. Fallback to mockDB if Supabase fails or returns null
      const mockModule = mockDB.read("modules", String(moduleId));
      if (mockModule) {
        setMod({ 
          id: mockModule.id, 
          moduleName: mockModule.moduleName 
        });
      }
    }
    
    loadModule();
  }, [moduleId]);

  useEffect(() => {
    async function loadTutors() {
      try {
        const realTutors = await testInvigilationRepository.listAvailableTutors();
        if (realTutors.length > 0) {
          setTutorCandidates(realTutors.map(t => ({ studentId: t.studentId, name: t.fullName })));
          return;
        }
      } catch (e) {
        console.log("Using mock tutors fallback");
      }

      // Fallback to mock if database query returns empty
      setTutorCandidates(mockDB.list("tutors").map((t) => ({ studentId: t.studentId, name: t.fullName })));
    }
    loadTutors();
  }, []);

  useEffect(() => {
    async function loadVenues() {
      try {
        const activeVenues = await venueRepository.listActiveVenues();
        setVenues(
          activeVenues.map((v) => ({
            id: v.id,
            name: v.buildingName ? `${v.name} (${v.buildingName})` : v.name,
          }))
        );
      } catch (e) {
        show({ 
          type: "error", 
          title: "Venue Error", 
          message: e instanceof Error ? e.message : "Could not load venues." 
        });
      }
    }
    loadVenues();
  }, []);

return (
    <ScreenShell title="Start test / exam" subtitle={mod?.moduleName} showBack scroll>
      <Text style={{ color: colors.ink.muted, marginBottom: 12, lineHeight: 22 }}>
        Select the venue, assessment type, and assign optional invigilators. 
      </Text>
      
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Pressable
          onPress={() => setSessionType("test")}
          style={{
            flex: 1, padding: 12, borderRadius: 8, alignItems: "center",
            backgroundColor: sessionType === "test" ? colors.palette.primary : colors.surface.soft,
          }}
        >
          <Text style={{ color: sessionType === "test" ? "#fff" : colors.ink.default, fontWeight: "600" }}>Test</Text>
        </Pressable>
        <Pressable
          onPress={() => setSessionType("exam")}
          style={{
            flex: 1, padding: 12, borderRadius: 8, alignItems: "center",
            backgroundColor: sessionType === "exam" ? colors.palette.primary : colors.surface.soft,
          }}
        >
          <Text style={{ color: sessionType === "exam" ? "#fff" : colors.ink.default, fontWeight: "600" }}>Exam</Text>
        </Pressable>
      </View>

      <AppInput label="Assessment title" value={title} onChangeText={setTitle} />
      
      <Text style={{ color: colors.palette.primary, fontWeight: "800", marginTop: 16, marginBottom: 8 }}>
        Select Venue
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {venues.map((v) => {
            const isSelected = selectedVenueId === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelectedVenueId(v.id)}
                style={{
                  paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1,
                  borderColor: isSelected ? colors.palette.accent : colors.border.subtle,
                  backgroundColor: isSelected ? "rgba(0,98,129,0.08)" : colors.surface.base,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.ink.default }}>{v.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text style={{ color: colors.palette.primary, fontWeight: "800", marginTop: 8, marginBottom: 8 }}>
        Add tutor invigilators (optional)
      </Text>
      {tutorCandidates.map((t) => {
        const on = selectedTutors.includes(t.studentId);
        return (
          <Pressable
            key={t.studentId}
            onPress={() => setSelectedTutors((prev) => on ? prev.filter((id) => id !== t.studentId) : [...prev, t.studentId])}
            style={{
              padding: 12, marginBottom: 8, borderRadius: 10, borderWidth: 1,
              borderColor: on ? colors.palette.accent : colors.border.subtle,
              backgroundColor: on ? "rgba(0,98,129,0.08)" : colors.surface.base,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.ink.default }}>{t.name}</Text>
          </Pressable>
        );
      })}
      
      <View style={{ height: 16 }} />
      <AppButton
        title={busy ? "Starting…" : `Start ${sessionType} session`}
        disabled={busy || !mod || !selectedVenueId}
        onPress={async () => {
          if (!user || user.role !== "lecturer" || !mod || !selectedVenueId) return;
          setBusy(true);
          try {
            // Find the tutor's name directly from your local state, no mockDB needed
            const tutors = selectedTutors.map((sid) => {
              const candidate = tutorCandidates.find(t => t.studentId === sid);
              return {
                studentId: sid,
                fullName: candidate?.name ?? sid, 
              };
            });
            
            const sess = await testInvigilationRepository.startTest({
              moduleId: mod.id,
              lecturerId: user.id,
              title,
              sessionType,
              venueId: selectedVenueId,
              tutorInvigilators: tutors,
            });
            
            show({ type: "success", title: "Assessment session live" });
            router.replace(`/lecturer/test-invigilate/${sess.id}` as never);
          } catch (e) {
            show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "" });
          } finally {
            setBusy(false);
          }
        }}
      />
      <View style={{ height: 40 }} />
    </ScreenShell>
  );

  // return (
  //   <ScreenShell title="Start test / exam" subtitle={mod?.moduleName} showBack scroll>
  //     <Text style={{ color: colors.ink.muted, marginBottom: 12, lineHeight: 22 }}>
  //       Scan student cards or enter numbers. Add tutors to invigilate — any module, not only their tutor modules.
  //       Two invigilators can scan left/right on one shared register with no duplicates.
  //     </Text>
  //     <AppInput label="Test title" value={title} onChangeText={setTitle} />
  //     <Text style={{ color: colors.palette.primary, fontWeight: "800", marginTop: 16, marginBottom: 8 }}>
  //       Add tutor invigilators (optional)
  //     </Text>
  //     {tutorCandidates.map((t) => {
  //       const on = selectedTutors.includes(t.studentId);
  //       return (
  //         <Pressable
  //           key={t.studentId}
  //           onPress={() =>
  //             setSelectedTutors((prev) =>
  //               on ? prev.filter((id) => id !== t.studentId) : [...prev, t.studentId]
  //             )
  //           }
  //           style={{
  //             padding: 12,
  //             marginBottom: 8,
  //             borderRadius: 10,
  //             borderWidth: 1,
  //             borderColor: on ? colors.palette.accent : colors.border.subtle,
  //             backgroundColor: on ? "rgba(0,98,129,0.08)" : colors.surface.base,
  //           }}
  //         >
  //           <Text style={{ fontWeight: "700", color: colors.ink.default }}>{t.name}</Text>
  //         </Pressable>
  //       );
  //     })}
  //     <View style={{ height: 16 }} />
  //     <AppButton
  //       title={busy ? "Starting…" : "Start test session"}
  //       disabled={busy || !mod}
  //       onPress={() => {
  //         if (!user || user.role !== "lecturer" || !mod) return;
  //         setBusy(true);
  //         try {
  //           const tutors = selectedTutors.map((sid, idx) => {
  //             const t = mockDB.query("tutors", { studentId: sid })[0];
  //             return {
  //               studentId: sid,
  //               fullName: t?.fullName ?? sid,
  //               canScan: true,
  //               scanSide: (idx % 2 === 0 ? "left" : "right") as "left" | "right",
  //             };
  //           });
  //           const sess = testInvigilationService.startTest({
  //             moduleId: mod.id,
  //             lecturerId: user.id,
  //             title,
  //             tutorInvigilators: tutors,
  //           });
  //           show({ type: "success", title: "Test session live" });
  //           router.replace(`/lecturer/test-invigilate/${sess.id}` as never);
  //         } catch (e) {
  //           show({ type: "error", title: "Failed", message: e instanceof Error ? e.message : "" });
  //         } finally {
  //           setBusy(false);
  //         }
  //       }}
  //     />
  //   </ScreenShell>
  // );
}
