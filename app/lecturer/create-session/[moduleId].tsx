import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { mockDB } from "@/mockDB/mockDBService";
import { attendanceSimulationService } from "@/services/attendanceSimulationService";
import { captureLocationOnce } from "@/utils/captureLocationOnce";
import { useToastStore } from "@/store/toastStore";
import { isSupabaseEnabled, requireSupabaseClient } from "@/supabase";
import { TABLES } from "@/supabase";
import { venueRepository, type Venue } from "@/services/supabase/venueRepository";

export default function LecturerCreateSessionScreen() {
  useRoleGuard(["lecturer", "tutor"]);

  const { moduleId } = useLocalSearchParams() as { moduleId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const show = useToastStore((s) => s.show);
  const [busy, setBusy] = useState(false);

  const [mod, setMod] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);

  useEffect(() => {
    async function loadModule() {
      try {
        if (isSupabaseEnabled()) {
          const supabase = requireSupabaseClient();
          const { data, error } = await supabase
            .from(TABLES.modules)
            .select("*")
            .eq("id", moduleId)
            .single();
          if (error) throw error;
          setMod({
            id: data.id,
            moduleName: data.module_name,
            lecturerId: data.lecturer_id,
            coLecturerIds: data.co_lecturer_ids || [],
            activeSessionId: data.active_session_id,
          });
        } else {
          setMod(mockDB.read("modules", String(moduleId)));
        }
      } catch (err) {
        console.error("Failed to load module:", err);
        show({ type: "error", title: "Error", message: "Failed to load module details." });
      } finally {
        setLoading(false);
      }
    }
    loadModule();
  }, [moduleId]);

  // Load venues (they carry the geofence the server enforces).
  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    let cancelled = false;
    setLoadingVenues(true);
    venueRepository
      .listActiveVenues()
      .then((vs) => {
        if (!cancelled) setVenues(vs);
      })
      .catch((e) => show({ type: "error", title: "Venues", message: e?.message ?? "Could not load venues." }))
      .finally(() => {
        if (!cancelled) setLoadingVenues(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const venueRequired = isSupabaseEnabled();

  const executeStartSession = async () => {
    if (!user || !mod) return;
    if (user.role !== "lecturer" && user.role !== "tutor") return;
    if (venueRequired && !venueId) {
      show({ type: "error", title: "Pick a venue", message: "Choose the class venue — it sets the geofence." });
      return;
    }
    setBusy(true);
    try {
      const loc = await captureLocationOnce();
      const hostRole = user.role === "tutor" ? "tutor" : "lecturer";
      const hostId = user.role === "tutor" ? user.studentId : user.id;

      const session = await attendanceSimulationService.createSession({
        moduleId: mod.id,
        hostRole,
        hostId,
        lecturerId: mod.lecturerId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radiusMeters: selectedVenue?.radiusMeters ?? 50,
        durationMinutes: 25,
        venueId: venueId ?? undefined,
      });
      show({ type: "success", title: "Session live" });
      router.replace(`/lecturer/active-session/${session.id}`);
    } catch (e) {
      show({ type: "error", title: "Could not start", message: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  };

  const handleStartAttempt = () => {
    if (!mod) return;
    if (mod.activeSessionId) {
      Alert.alert(
        "Active Session Running",
        "There is already an active attendance session for this module. Close it and start a new one?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Close & Start New",
            style: "destructive",
            onPress: async () => {
              try {
                setBusy(true);
                const endResult = await attendanceSimulationService.endSession({
                  sessionId: mod.activeSessionId,
                  moduleId: mod.id,
                  lecturerId: mod.lecturerId,
                });
                if (!endResult.ok) throw new Error(endResult.reason || "Could not close active session.");
                show({ type: "info", title: "Previous session closed" });
                await executeStartSession();
              } catch (err) {
                show({
                  type: "error",
                  title: "Failed to close old session",
                  message: err instanceof Error ? err.message : "Unknown error.",
                });
                setBusy(false);
              }
            },
          },
        ]
      );
    } else {
      executeStartSession();
    }
  };

  return (
    <ScreenShell title="Start session" subtitle={mod?.moduleName ?? "Module"} showBack scroll>
      <Text style={{ color: colors.ink.muted, lineHeight: 22, marginBottom: 16 }}>
        Pick the venue — it defines the geofence students must be inside. Attendance is validated on the server: inside
        the venue radius + the current rotating code.
      </Text>

      {venueRequired ? (
        <>
          <AppText variant="label" style={{ marginBottom: 8 }}>
            Venue
          </AppText>
          {loadingVenues ? (
            <ActivityIndicator color={colors.palette.accent} />
          ) : venues.length === 0 ? (
            <AppCard>
              <AppText variant="caption" color={colors.ink.subtle}>
                No venues configured. Ask an admin to add a venue with a location + radius.
              </AppText>
            </AppCard>
          ) : (
            <View style={{ gap: 10 }}>
              {venues.map((v) => {
                const selected = v.id === venueId;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => setVenueId(v.id)}
                    style={{
                      backgroundColor: colors.surface.base,
                      borderRadius: 14,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.palette.accent : "rgba(11,15,20,0.08)",
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected ? colors.palette.accent : colors.border.subtle,
                        backgroundColor: selected ? colors.palette.accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected ? <AppText style={{ color: colors.ink.inverse, fontSize: 12 }}>✓</AppText> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong">{v.name}</AppText>
                      <AppText variant="caption" color={colors.ink.subtle}>
                        {v.campusName}
                        {v.buildingName ? ` · ${v.buildingName}` : ""} · radius {v.radiusMeters ?? 50} m
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={{ height: 20 }} />
        </>
      ) : null}

      <AppButton
        title={busy ? "Starting…" : "Capture GPS & start session"}
        disabled={busy || !mod || (venueRequired && !venueId)}
        onPress={handleStartAttempt}
      />
    </ScreenShell>
  );
}
