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
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { dummyHeatmapMatrix, hodModuleBars, hodRiskTrend } from "@/services/dashboardChartDummy";
import { mockDB } from "@/mockDB/mockDBService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import { getDataSource } from "@/services/dataSource";
import { analyticsRepository } from "@/services/analyticsRepository";
import { AnalyticsDepartmentRisk, AnalyticsHeatmapData, AnalyticsModulePerformance } from "@/types/analytics.types";

export default function HodAnalyticsSimulationScreen() {
  useRoleGuard("hod");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const departmentId = user?.role === "hod" ? user.departmentId : "";
  const v = useMockDbVersionStore((s) => s.version);

  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState<{
    modBars: AnalyticsModulePerformance[];
    risk: AnalyticsDepartmentRisk[];
    heat: AnalyticsHeatmapData[]; }>({ modBars: [], risk: [], heat: [] }) ;

  const [isLoading, setIsLoading] = useState(true); 

  const overview = useMemo(() => {
    mockDB.touch();
    return institutionAnalytics.departmentOverview(departmentId);
  }, [departmentId, v]);

 const mockModBars = useMemo(() => hodModuleBars(overview), [overview]);
 const mockRisk = useMemo(() => hodRiskTrend(overview.attendanceRate).map((x) => x * 100), [overview]);
 const mockHeat = useMemo(() => dummyHeatmapMatrix(`hod-${departmentId}`), [departmentId]);

 //const modBars = isLive ? liveData.modBars.map(m => ({ label: m.module_name, value: m.avg_attendance })) : mockModBars;
const modBars = useMemo(() => {
  if (!isLive) return mockModBars;

  return liveData.modBars.map(m => {
    const shortLabel = m.module_name.split(" ")[0] ?? m.module_name;
    
    return {
      label: shortLabel,
      // If avg_attendance is already 0-100, just round it.
      // If it is 0-1, keep the * 100.
      value: m.avg_attendance > 1 ? Math.round(m.avg_attendance) : Math.round(m.avg_attendance * 100),
      subtitle: `${m.enrolled_count || 0} students` 
    };
  });
}, [isLive, liveData.modBars, mockModBars]);

 const risk = isLive ? liveData.risk.map(d => d.attendance_rate) : mockRisk;

 const finalHeatmap = useMemo(() => {
  if (!isLive) return mockHeat;
  
  const matrix = Array.from({ length: 5 }, () => Array(7).fill(0));
  
  liveData.heat.forEach(item => {
    // Check if the item has the correct indices
    if (item.week_index >= 0 && item.week_index < 5 && 
        item.day_of_week >= 0 && item.day_of_week < 7) {
      matrix[item.week_index][item.day_of_week] = item.intensity;
    }
  });
  return matrix;
}, [isLive, liveData.heat, mockHeat]);

useEffect(() => {
    async function loadFullAnalytics() {
      if (getDataSource() === "supabase") {
        setIsLive(true);
        try {
          const [modData, riskData, heatData] = await Promise.all([
             analyticsRepository.fetchModulePerformance(departmentId),
             analyticsRepository.fetchDepartmentRiskTrends(departmentId),
             analyticsRepository.fetchHeatmapData(departmentId)
          ]);
          setLiveData({ modBars: modData, risk: riskData, heat: heatData });
        } catch (e) {
          console.error("Analytics fetch failed", e);
        }
      }
      setIsLoading(false);
    }
    loadFullAnalytics();
  }, [departmentId, v]);

 if (isLoading) return <ScreenShell title="Loading..."><Text>Fetching data...</Text></ScreenShell>;
  return (
    <ScreenShell title="Department analytics" subtitle="Charts simulation (scoped to your department)" scroll showBack>
      <Text style={{ color: colors.ink.muted, marginBottom: 14, lineHeight: 22 }}>
        Module bars use synthetic attendance proxies; trend shows fictional risk trajectory anchored on department rate.
      </Text>

      <AppCard>
        <StatsBarChart title="Module attendance proxy (%)" data={modBars} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <StatsLineChart title={isLive ? "At-risk trajectory (Live)" : "At-risk trajectory (Simulation)"} points={risk}  isLive={isLive} />
      </AppCard>

      <View style={{ height: 14 }} />

      <AppCard>
        <MockHeatmapGrid title={isLive ? "Module × day activity" : "Module × day activity (simulation)"} matrix={finalHeatmap} />
      </AppCard>

      <View style={{ height: 18 }} />

      <AppButton title="Back to dashboard" onPress={() => router.back()} />
    </ScreenShell>
  );
}
