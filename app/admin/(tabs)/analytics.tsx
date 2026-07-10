import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { MockHeatmapGrid } from "@/components/ui/MockHeatmapGrid";
import { colors } from "@/theme";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import {
  adminAttendanceTrend,
  adminEnrolmentSplit,
  adminFacultyBars,
  dummyHeatmapMatrix,
} from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

export default function AdminAnalyticsSimulationScreen() {
  useRoleGuard("admin");
  const router = useRouter();
  const v = useMockDbVersionStore((s) => s.version);

  const [overview, setOverview] = useState<any>(null);
const [isLoading, setIsLoading] = useState(true);
  
useEffect(() => {
  async function loadData() {
    setIsLoading(true);
    mockDB.touch();
    const data = await institutionAnalytics.universityOverview();
    setOverview(data); // This holds the actual data object now
    setIsLoading(false);
  }
  loadData();
}, [v]);  

const facultyBars = useMemo(() => overview ? adminFacultyBars(overview) : [], [overview]);
const trend = useMemo(() => overview ? adminAttendanceTrend(overview.overallAttendanceRate) : [], [overview]);
const enrol = useMemo(() => overview ? adminEnrolmentSplit(overview) : [], [overview]);
  const heat = useMemo(() => dummyHeatmapMatrix("admin-university"), []);

  return (
    <ScreenShell title="Analytics simulation" subtitle="University-wide charts (mock + dummy trends)" scroll showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        View-only simulation for stakeholder demos. Replace series with Supabase rollups (JOB-019 / JOB-020).
      </Text>

      <AppCard>
        <StatsBarChart title="Average attendance by faculty (%)" data={facultyBars} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsLineChart
          title="14-day campus attendance index (%)"
          points={trend}
          labels={trend.map((_, i) => `D${i + 1}`)}
        />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsBarChart title="Relative enrolment weight by faculty (count)" data={enrol} max={Math.max(...enrol.map((e) => e.value), 1)} unit="" />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <MockHeatmapGrid title="Participation heatmap (dummy week grid)" matrix={heat} />
      </AppCard>

      <View style={{ height: 18 }} />

      <AppButton title="Back to overview" onPress={() => router.back()} />
    </ScreenShell>
  );
}
