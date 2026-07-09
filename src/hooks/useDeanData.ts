import { analyticsRepository } from "@/services/analyticsRepository";
import { institutionAnalytics } from "@/services/institutionAnalytics";
import { useEffect,  useState } from "react";
import { AnalyticsFacultyDepartmentSummary, AnalyticsLecturerPerformance } from "@/types/analytics.types";
import { isSupabaseDataSource } from "@/services/dataSource";

interface DeanDataState {
  departments: AnalyticsFacultyDepartmentSummary[];
  lecturers: AnalyticsLecturerPerformance[];
  loading: boolean;
}

export function useDeanData(facultyId: string) {
  const [data, setData] = useState<DeanDataState>({ departments: [], lecturers: [], loading: true });

  useEffect(() => {
    async function load() {
      setData(prev => ({ ...prev, loading: true }));
      
      if (isSupabaseDataSource()) {
        const [deptData, lectData] = await Promise.all([
          analyticsRepository.fetchDeanFacultyOverview(facultyId),
          analyticsRepository.fetchDeanLecturerPerformance()
        ]);
        setData({ departments: deptData, lecturers: lectData, loading: false });
      } else {
        // FLOW 2: SIMULATION (as you had before)
        const overview =  await institutionAnalytics.facultyOverview(facultyId);

        // Transform the data to match AnalyticsFacultyDepartmentSummary
        const transformedDepts: AnalyticsFacultyDepartmentSummary[] = overview.departmentStats.map((d:any) => ({
        department_id: d.departmentId,
        department_name: d.name,
        faculty_id: facultyId, // map existing facultyId
        student_count: d.studentCount,
        avg_attendance: d.avgAttendance * 100 // Ensure units match (percentage)
        }));

        setData({ 
                departments: transformedDepts, 
                lecturers: overview.lecturerPerformance.map((l:any) => ({
                lecturer_id: l.lecturerId,
                lecturer_name: l.name,
                modules_taught: l.modulesTaught,
                marks_recorded: l.marksRecorded
 })), 
                loading: false 
             });
      }
    }
    load();
  }, [facultyId]);

  return data;
}