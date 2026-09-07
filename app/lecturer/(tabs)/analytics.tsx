import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

import {
  AppButton,
  AppCard,
  AppText,
  DividerListRow,
  HighlightStat,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { colors } from "@/theme";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { institutionAnalytics, type LecturerAnalytics } from "@/services/institutionAnalytics";

const EMPTY: LecturerAnalytics = {
  moduleCount: 0,
  sessionCount: 0,
  recordCount: 0,
  activeSessions: 0,
  overallParticipation: 0,
  moduleStats: [],
};

export default function LecturerAttendanceAnalyticsScreen() {
  useRoleGuard("lecturer");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const [data, setData] = useState<LecturerAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  const lecturerId = user?.role === "lecturer" ? user.id : "";

  useEffect(() => {
    let cancelled = false;
    if (!lecturerId) return;
    setLoading(true);
    institutionAnalytics
      .lecturerAnalytics(lecturerId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => console.warn("lecturerAnalytics load failed:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lecturerId, v]);

  if (loading) {
    return (
      <ScreenShell title="Analytics" subtitle="Your teaching overview" showBack>
        <Spacer size="xl" />
        <ActivityIndicator size="large" color={colors.palette.accent} />
      </ScreenShell>
    );
  }

  const withSessions = data.moduleStats.filter((m) => m.sessions > 0);
  const best = withSessions[0];
  const needsAttention = withSessions.length > 1 ? withSessions[withSessions.length - 1] : undefined;

  const bars = data.moduleStats.map((m) => ({
    label: m.code,
    value: Math.round(m.participation * 100),
    subtitle: `${m.records} marks`,
  }));

  return (
    <ScreenShell title="Analytics" subtitle="Your teaching overview" scroll showBack>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Attendance across the modules you teach — participation is the average share of enrolled
        students marked present per session.
      </AppText>

      <HighlightStat
        label="Overall attendance"
        value={`${(data.overallParticipation * 100).toFixed(0)}%`}
        detail={`${data.moduleCount} modules · ${data.sessionCount} sessions · ${data.recordCount} marks`}
      />

      <Spacer size="md" />
      <Stack gap="sm" style={{ flexDirection: "row" }}>
        <View style={{ flex: 1 }}>
          <AppCard>
            <AppText variant="caption" color={colors.ink.subtle}>
              Live sessions now
            </AppText>
            <AppText variant="title" style={{ marginTop: 4 }}>
              {data.activeSessions}
            </AppText>
          </AppCard>
        </View>
        <View style={{ flex: 1 }}>
          <AppCard>
            <AppText variant="caption" color={colors.ink.subtle}>
              Attendance records
            </AppText>
            <AppText variant="title" style={{ marginTop: 4 }}>
              {data.recordCount}
            </AppText>
          </AppCard>
        </View>
      </Stack>

      {data.moduleStats.length === 0 ? (
        <>
          <Spacer size="lg" />
          <AppCard>
            <AppText variant="bodyStrong">No modules yet</AppText>
            <AppText variant="caption" color={colors.ink.subtle} style={{ marginTop: 4 }}>
              Once you own modules and run sessions, participation trends appear here.
            </AppText>
          </AppCard>
        </>
      ) : (
        <>
          <Spacer size="lg" />
          <AppCard>
            <StatsBarChart title="Participation by module (%)" data={bars} />
          </AppCard>

          {(best || needsAttention) && (
            <>
              <Spacer size="md" />
              <Stack gap="sm" style={{ flexDirection: "row" }}>
                {best ? (
                  <View style={{ flex: 1 }}>
                    <AppCard>
                      <AppText variant="caption" color={colors.palette.accent}>
                        Top module
                      </AppText>
                      <AppText variant="bodyStrong" style={{ marginTop: 4 }}>
                        {best.code}
                      </AppText>
                      <AppText variant="caption" color={colors.ink.subtle}>
                        {(best.participation * 100).toFixed(0)}% participation
                      </AppText>
                    </AppCard>
                  </View>
                ) : null}
                {needsAttention ? (
                  <View style={{ flex: 1 }}>
                    <AppCard>
                      <AppText variant="caption" color={colors.palette.primary}>
                        Needs attention
                      </AppText>
                      <AppText variant="bodyStrong" style={{ marginTop: 4 }}>
                        {needsAttention.code}
                      </AppText>
                      <AppText variant="caption" color={colors.ink.subtle}>
                        {(needsAttention.participation * 100).toFixed(0)}% participation
                      </AppText>
                    </AppCard>
                  </View>
                ) : null}
              </Stack>
            </>
          )}

          <Spacer size="md" />
          <AppCard>
            <SectionHeader title="Per-module breakdown" />
            {data.moduleStats.map((m) => (
              <DividerListRow
                key={m.moduleId}
                left={`${m.code} · ${m.name}`}
                right={`${(m.participation * 100).toFixed(0)}% · ${m.sessions} sessions`}
              />
            ))}
          </AppCard>
        </>
      )}

      <Spacer size="lg" />
      <AppButton title="Back to dashboard" variant="outline" onPress={() => router.push("/lecturer/dashboard")} />
      <Spacer size="lg" />
    </ScreenShell>
  );
}
