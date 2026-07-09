import { useEffect,useMemo,useState } from "react";
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
import { RoleQuickNav } from "@/components/navigation/RoleQuickNav";
import { StatsBarChart } from "@/components/charts/StatsBarChart";
import { StatsLineChart } from "@/components/charts/StatsLineChart";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { hodModuleBars, hodRiskTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";

import { getDataSource } from "@/services/dataSource";
import { analyticsRepository } from "@/services/analyticsRepository";
import { View } from "react-native";
import { colors } from "@/theme/colors";

export default function HodDashboardScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);
 const [liveModuleStats, setLiveModuleStats] = useState<any[]>([]);

  const departmentId = user?.role === "hod" ? user.departmentId : "";

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.departmentOverview(departmentId);
  }, [departmentId, v]);

  //const previewModBars = useMemo(() => hodModuleBars(overview).slice(0, 4), [overview]);

  
  const previewRisk = useMemo(() => hodRiskTrend(overview.attendanceRate).slice(-6).map((x) => x * 100), [overview]);

  const [riskTrendPoints, setRiskTrendPoints] = useState<number[]>([]);
  const [riskTrendLabels, setRiskTrendLabels] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

const previewModBars = useMemo(() => {
  if (isLive) {
    return liveModuleStats.map((m: any) => ({
      label: (m.module_name || "Unknown").split(" ")[0],
      value: Math.round(m.avg_attendance || 0),
      subtitle: `${m.enrolled_count || 0} students`
    })).slice(0, 4);
  }

  // Fallback to mock data
  return hodModuleBars(overview).slice(0, 4);
}, [overview, isLive, liveModuleStats]);

  // useEffect(() => {
  //   console.log("DEBUG: useEffect running. Department ID:", departmentId);
  //   async function loadTrends() {
  //     setIsLoading(true);
  //     const isSupabase = getDataSource() === "supabase";
  //     setIsLive(isSupabase);

  //     console.log("DEBUG: isSupabase flag evaluates to:", isSupabase);
  //     if (isSupabase) {
  //       // Fetch real data (Returns empty array if no data exists yet)
  //       console.log("DEBUG: About to call fetchDepartmentRiskTrends...");
  //       const liveData = await analyticsRepository.fetchDepartmentRiskTrends(departmentId);
  //       console.log("DEBUG: Data returned from Supabase:", liveData);
  //       // Map data to the chart arrays
  //       setRiskTrendPoints(liveData.map(d => Number(d.attendance_rate)));
  //       setRiskTrendLabels(liveData.map(d => {
  //         const date = new Date(d.trend_date);
  //         return `${date.getDate()}/${date.getMonth() + 1}`;
  //       }));
  //     } else {
  //       // Fallback to the dashboardChartDummy logic
  //       console.log("DEBUG: Taking the Mock Data path.");
  //       const mockRisk = hodRiskTrend(overview.attendanceRate).slice(-6).map((x) => x * 100);
  //       setRiskTrendPoints(mockRisk);
  //       setRiskTrendLabels([]); // Let chart auto-generate labels
  //     }
  //     setIsLoading(false);
  //   }

  //   if (departmentId) {
  //     loadTrends();
  //   }else{
  //     console.log("DEBUG: loadTrends skipped because departmentId is falsy.");
  //   }
  // }, [departmentId, v, overview.attendanceRate]); // Re-run if department or mock version changes

  useEffect(() => {
  async function loadData() {
    setIsLoading(true);
    const isSupabase = getDataSource() === "supabase";
    setIsLive(isSupabase);

    if (isSupabase) {
      // Fetch both the trends AND the module data from Supabase
      const [trends, modules] = await Promise.all([
        analyticsRepository.fetchDepartmentRiskTrends(departmentId),
        analyticsRepository.fetchModulePerformance(departmentId) // Hits your new view!
      ]);
      
      setRiskTrendPoints(trends.map(d => Number(d.attendance_rate)));
      setRiskTrendLabels(trends.map(d => {
        const date = new Date(d.trend_date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }));
      
      setLiveModuleStats(modules); // Update the state with real Supabase data
    }
    setIsLoading(false);
  }
  loadData();
}, [departmentId, v]);

  return (
    <ScreenShell title="Department overview" subtitle={overview.departmentName} scroll>
      <AppText variant="body" style={{ marginBottom: 14 }}>
        Head of Department view — courses, modules, lecturers, and student attendance risk within your department only.
      </AppText>

      <HighlightStat
        label="Department attendance rate"
        value={`${(overview.attendanceRate * 100).toFixed(1)}%`}
        detail={`Students tracked: ${overview.studentInsights.total} · At-risk (&lt;55%): ${overview.studentInsights.atRiskCount}`}
      />

      <AppCard>
        <SectionHeader title="Modules" />
        {overview.moduleStats.map((m) => (
          <DividerListRow key={m.moduleId} left={m.name} right={`${m.enrolled} enrolled`} />
        ))}
      </AppCard>

      <Spacer size="md" />

      <AppCard>
        <StatsBarChart title="Preview · modules (proxy %)" data={previewModBars} />
        <Spacer size="sm" />
        {/* <StatsLineChart title="Preview · at-risk trend" points={previewRisk} /> */}
       {isLoading ? (
          <AppText variant="caption" style={{ padding: 20, textAlign: "center" }}>Loading trends...</AppText>
        ) : riskTrendPoints.length > 0 ? (
          <StatsLineChart 
            title="Preview · at-risk trend" 
            points={riskTrendPoints} 
            labels={riskTrendLabels}
            isLive={isLive} 
          />
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <AppText variant="caption" style={{ color: colors.ink.muted }}>
              {isLive ? "No historical trend data available" : "Trend data simulated"}
            </AppText>
          </View>
        )}
      </AppCard>

      <Spacer size="md" />

      <AppButton title="Department analytics (full)" onPress={() => router.push("/hod/analytics")} />

      <Spacer size="lg" />
      <RoleQuickNav role="hod" />
    </ScreenShell>
  );
}
