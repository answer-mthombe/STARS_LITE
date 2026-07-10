import { useEffect,useMemo,useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

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

  // 1. Manage loading, error, and dynamic payload state
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Fetch the department-scoped data asynchronously
  useEffect(() => {
    if (!departmentId) return;

    let isMounted = true;
    async function loadHodData() {
      try {
        setLoading(true);
        const data = await institutionAnalytics.departmentOverview(departmentId);
        if (isMounted) {
          setOverview(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Failed to load department analytics.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHodData();
    return () => { isMounted = false; };
  }, [departmentId, v]);


  const previewRisk = useMemo(() => {
  return overview ? hodRiskTrend(overview.attendanceRate).slice(-6).map((x) => x * 100) : [];
}, [overview]);

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

  // Fallback to mock data with a safety check
  return overview ? hodModuleBars(overview).slice(0, 4) : [];
}, [overview, isLive, liveModuleStats]);


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
    <ScreenShell 
      title="Department overview" 
      // Safely handle the subtitle while loading so it doesn't crash
      subtitle={overview?.departmentName || "Loading..."} 
      scroll
    >
      {loading || !overview ? (
        // ==========================================
        // ⏳ SHOW THIS IF LOADING
        // ==========================================
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 40 }}>
          {/* Using the corrected colors.palette.primary */}
          <ActivityIndicator size="large" color={colors.palette.primary} />
          <AppText variant="caption" style={{ marginTop: 10 }}>Fetching department data...</AppText>
        </View>
      ) : (
        // ==========================================
        // ✅ SHOW THIS WHEN DATA IS READY
        // ==========================================
        <>
          <AppText variant="body" style={{ marginBottom: 14 }}>
            Head of Department view — courses, modules, lecturers, and student attendance risk within your department only.
          </AppText>

          <HighlightStat
            label="Department attendance rate"
            value={`${(overview.attendanceRate * 100).toFixed(1)}%`}
            detail={`Students tracked: ${overview.studentInsights?.total ?? 0} · At-risk (<55%): ${overview.studentInsights?.atRiskCount ?? 0}`}
          />

          <Spacer size="md" />

          <AppCard>
            <SectionHeader title="Modules" />
            {overview.moduleStats?.map((m: any) => (
              <DividerListRow key={m.moduleId} left={m.name} right={`${m.enrolled} enrolled`} />
            ))}
          </AppCard>

          <Spacer size="md" />

          <AppCard>
            <StatsBarChart title="Preview · modules (proxy %)" data={previewModBars} />
            <Spacer size="sm" />
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
        </>
      )}
    </ScreenShell>
  );
}