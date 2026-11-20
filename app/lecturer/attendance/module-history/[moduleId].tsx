
import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  attendanceRepository,
  type RecentAttendanceSession,
} from "@/services/supabase/attendanceRepository";
import {
  type SessionAttendanceExportRow,
} from "@/services/supabase/attendanceRepository";
import {
  AppText,
  Chip,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

const PAGE_SIZE = 10;

export default function ModuleAttendanceHistoryScreen() {
  useRoleGuard("lecturer");

  const router = useRouter();
  const params = useLocalSearchParams();
  const moduleId =
  typeof params.moduleId === "string"
    ? params.moduleId
    : Array.isArray(params.moduleId)
      ? params.moduleId[0]
      : "";

  const user = useAuthStore((state) => state.user);

  const [sessions, setSessions] = useState<RecentAttendanceSession[]>([]);
  const [moduleCode, setModuleCode] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!user?.id || !moduleId) {
      setError("The lecturer or module could not be identified.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result =
        await attendanceRepository.getModuleAttendanceHistory(
          user.id,
          moduleId,
          0,
          PAGE_SIZE
        );

      setSessions(result.sessions);
      setModuleCode(result.moduleCode);
      setTotalCount(result.totalCount);
    } catch (e: unknown) {
      console.error("[STARS HISTORY] Module history error:", e);

      setError(
        e instanceof Error
          ? e.message
          : "Could not load this module's history."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id, moduleId]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (!user?.id || !moduleId || loadingMore) return;

    try {
      setLoadingMore(true);
      setError(null);

      const result =
        await attendanceRepository.getModuleAttendanceHistory(
          user.id,
          moduleId,
          sessions.length,
          PAGE_SIZE
        );

      setSessions((current) => {
        const existingIds = new Set(current.map((item) => item.id));

        return [
          ...current,
          ...result.sessions.filter((item) => !existingIds.has(item.id)),
        ];
      });

      setTotalCount(result.totalCount);
    } catch (e: unknown) {
      console.error("[STARS HISTORY] Load more error:", e);

      setError(
        e instanceof Error
          ? e.message
          : "Could not load more sessions."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const exportAllModuleSessions = async () => {
    if (!user?.id || !moduleId || exporting) return;

    try {
      setExporting(true);
      setExportError(null);

      // Fetch every completed session and its student records
      // for this module only.
      const rows =
        await attendanceRepository.getModuleAttendanceExportRows(
          user.id,
          moduleId
        );

      if (rows.length === 0) {
        setExportError("There are no attendance records to export.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      // One worksheet for each completed session.
      const grouped = new Map<string, typeof rows>();

      for (const row of rows) {
        const existing = grouped.get(row.sessionId) ?? [];
        existing.push(row);
        grouped.set(row.sessionId, existing);
      }

      let sheetNumber = 1;

      for (const [sessionId, sessionRows] of grouped.entries()) {
        const first = sessionRows[0];

        const data = [
          ["Module Code", first.moduleCode],
          ["Session Date", first.sessionDate],
          ["Session ID", sessionId],
          [],
          [
            "Student Number",
            "Student Name",
            "Attendance Status",
            "First Attendance Event",
            "Last Recorded Event",
            "Number of Exits",
          ],
          ...sessionRows.map((student: SessionAttendanceExportRow) => [
            student.studentNumber,
            student.fullName,
            student.attendanceStatus,
            student.firstAttendanceAt
              ? new Date(student.firstAttendanceAt).toLocaleString()
              : "—",
            student.lastEventAt
              ? new Date(student.lastEventAt).toLocaleString()
              : "—",
            student.exitCount,
          ]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);

        worksheet["!cols"] = [
          { wch: 20 },
          { wch: 28 },
          { wch: 18 },
          { wch: 25 },
          { wch: 25 },
          { wch: 16 },
        ];

        const sheetName = `Session ${sheetNumber}`.slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        sheetNumber++;
      }

      const excelBase64 = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "base64",
      });

      const safeModuleCode = (moduleCode || "Module")
        .replace(/[^a-z0-9_-]/gi, "_");

      const fileName =
        `All_Attendance_${safeModuleCode}.xlsx`;

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, excelBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        setExportError(
          `Excel file created at ${fileUri}, but sharing is unavailable on this device.`
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Export all module attendance",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (e: any) {
      console.error("[STARS EXPORT] Module export failed:", e);
      setExportError(
        e?.message ?? "Could not export this module's attendance."
      );
    } finally {
      setExporting(false);
    }
  };

  const hasMore = sessions.length < totalCount;

  return (
    <ScreenShell
      title={moduleCode || "Module history"}
      subtitle="Completed attendance sessions"
      right={
        <Chip
          label="Back"
          variant="outline"
          onPress={() =>
            router.replace("/lecturer/attendance/history" as never)
          }
        />
      }
    >
      {loading ? (
        <View style={{ alignItems: "center", padding: 30 }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Spacer size="md" />
          <AppText variant="body">Loading module history...</AppText>
        </View>
      ) : error && sessions.length === 0 ? (
        <Stack gap="md">
          <AppText variant="body" style={{ color: "#C0392B" }}>
            {error}
          </AppText>

          <Chip
            label="Try again"
            variant="accent"
            onPress={() => void loadFirstPage()}
          />
        </Stack>
      ) : sessions.length === 0 ? (
        <AppText variant="body">
          No completed sessions were found for this module.
        </AppText>
      ) : (
        <Stack gap="md">
          <SectionHeader title="Session records" overline />

          <AppText variant="body" style={{ color: "#687076" }}>
            Showing {sessions.length} of {totalCount} sessions
          </AppText>

          <Chip
            label={
              exporting
                ? "Preparing Excel workbook..."
                : "Download ALL sessions for this module"
            }
            variant="accent"
            onPress={() => void exportAllModuleSessions()}
          />

          {exporting ? (
            <View style={{ alignItems: "center", padding: 10 }}>
              <ActivityIndicator size="small" color="#2563EB" />
              <AppText variant="body">
                Preparing all module attendance records...
              </AppText>
            </View>
          ) : null}

          {exportError ? (
            <AppText variant="body" style={{ color: "#C0392B" }}>
              {exportError}
            </AppText>
          ) : null}

          {sessions.map((session, index) => (
            <View
              key={session.id}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                padding: 14,
                backgroundColor: "#FFFFFF",
              }}
            >
              <AppText
                variant="body"
                style={{ fontWeight: "700", marginBottom: 5 }}
              >
                {session.date}
              </AppText>

              <AppText
                variant="body"
                style={{
                  fontSize: 12,
                  color: "#687076",
                  marginBottom: 10,
                }}
              >
                Session {index + 1} · {session.totalStudents} enrolled students
              </AppText>

              <Chip
                label="View attendance register"
                variant="outline"
                onPress={() =>
                  router.push(
                    `/lecturer/attendance/final/${session.id}` as never
                  )
                }
              />
            </View>
          ))}

          {error ? (
            <AppText variant="body" style={{ color: "#C0392B" }}>
              {error}
            </AppText>
          ) : null}

          {hasMore ? (
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Chip
                  label={`Load 10 more (${totalCount - sessions.length} remaining)`}
                  variant="outline"
                  onPress={() => void loadMore()}
                />
              )}
            </View>
          ) : (
            <AppText
              variant="body"
              style={{ textAlign: "center", color: "#687076" }}
            >
              All sessions have been loaded.
            </AppText>
          )}
        </Stack>
      )}

      <Spacer size="lg" />

      <Chip
        label="Back to modules"
        variant="outline"
        onPress={() =>
          router.replace("/lecturer/attendance/history" as never)
        }
      />

      <Spacer size="lg" />
    </ScreenShell>
  );
}
