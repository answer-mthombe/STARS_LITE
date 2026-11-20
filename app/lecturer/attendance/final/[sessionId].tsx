
import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";


import {
  attendanceRepository,
  SessionAttendanceExportRow,
  type SessionRosterStudent,
} from "@/services/supabase/attendanceRepository";

import {
  AppText,
  Chip,
  Row,
  ScreenShell,
  SectionHeader,
  Spacer,
  Stack,
} from "@/components/ui";

export default function FinalAttendanceRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const sessionId =
    typeof params.sessionId === "string"
      ? params.sessionId
      : Array.isArray(params.sessionId)
        ? params.sessionId[0]
        : "";

  const [roster, setRoster] = useState<SessionRosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);

  const loadRegister = useCallback(async () => {
    if (!sessionId) {
      setError("Session ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [students, session] = await Promise.all([
        attendanceRepository.getSessionRosterWithNames(sessionId),
        attendanceRepository.getAttendanceSession(sessionId),
      ]);

      setRoster(students);
      setEndedAt(session?.endedAt ?? null);
      setError(null);
    } catch (e: any) {
      console.error("[STARS] Final register error:", e);
      setError(e?.message ?? "Could not load the final register.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  const exportSelectedSession = async () => {
    if (!sessionId || exporting) return;

    try {
      setExporting(true);
      setExportError(null);

      // Fetch export data directly from the database.
      const rows =
        await attendanceRepository.getSessionAttendanceExportRows(
          sessionId
        );

      if (rows.length === 0) {
        setExportError("There are no student records to export.");
        return;
      }

      const worksheetData = [
        [
          "Module Code",
          "Session Date",
          "Student Number",
          "Student Name",
          "Attendance Status",
          "First Attendance Event",
          "Last Recorded Event",
          "Number of Exits",
        ],
        ...rows.map((student: SessionAttendanceExportRow) => [
          student.moduleCode,
          student.sessionDate,
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

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet["!cols"] = [
        { wch: 15 },
        { wch: 22 },
        { wch: 20 },
        { wch: 28 },
        { wch: 18 },
        { wch: 25 },
        { wch: 25 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const excelBase64 = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "base64",
      });

      const safeModuleCode = (rows[0].moduleCode || "Module")
        .replace(/[^a-z0-9_-]/gi, "_");

      const fileName =
        `Attendance_${safeModuleCode}_${sessionId}.xlsx`;

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
        dialogTitle: "Export attendance register",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (e: any) {
      console.error("[STARS EXPORT] Selected session export failed:", e);
      setExportError(
        e?.message ?? "Could not export this attendance register."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenShell
      title="Attendance register"
      subtitle="Final student attendance"
      right={
        <Chip
          label="History"
          variant="outline"
          onPress={() =>
            router.replace("/lecturer/(tabs)/dashboard" as never)
          }
        />
      }
    >
      <View
        style={{
          backgroundColor: "#F1F8E9",
          borderRadius: 10,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <AppText
          variant="body"
          style={{ fontWeight: "700", color: "#33691E" }}
        >
          Session completed
        </AppText>

        <AppText
          variant="body"
          style={{ fontSize: 12, color: "#555", marginTop: 4 }}
        >
          {endedAt
            ? `Ended: ${new Date(endedAt).toLocaleString()}`
            : "Session end time unavailable"}
        </AppText>
      </View>

      <SectionHeader title="Student register" overline />

      {loading ? (
        <AppText variant="body">Loading register…</AppText>
      ) : error ? (
        <AppText variant="body" style={{ color: "#C0392B" }}>
          {error}
        </AppText>
      ) : roster.length === 0 ? (
        <AppText variant="body">
          No students were found for this session.
        </AppText>
      ) : (
        <Stack gap="sm">
          {roster.map((student) => {
            const isPresent = student.status !== "not_seen";

            return (
              <View
                key={student.studentId}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 10,
                  padding: 13,
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Row
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <AppText variant="body" style={{ fontWeight: "700" }}>
                      {student.fullName}
                    </AppText>

                    <AppText
                      variant="body"
                      style={{
                        fontSize: 12,
                        color: "#687076",
                        marginTop: 3,
                      }}
                    >
                      {student.studentNumber}
                    </AppText>
                  </View>

                  <AppText
                    variant="body"
                    style={{
                      fontWeight: "700",
                      color: isPresent ? "#2E7D32" : "#C0392B",
                    }}
                  >
                    {isPresent ? "Present" : "Absent"}
                  </AppText>
                </Row>
              </View>
            );
          })}
        </Stack>
      )}

      <Spacer size="lg" />

      {!loading && !error && roster.length > 0 ? (
        <>
          <Chip
            label={
              exporting
                ? "Preparing Excel file..."
                : "Download this session as Excel"
            }
            variant="accent"
            onPress={() => void exportSelectedSession()}
          />

          {exporting ? (
            <View style={{ alignItems: "center", padding: 10 }}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : null}

          {exportError ? (
            <AppText
              variant="body"
              style={{ color: "#C0392B", marginTop: 8 }}
            >
              {exportError}
            </AppText>
          ) : null}
        </>
      ) : null}

      <Spacer size="lg" />

      <Chip
        label="Back to dashboard"
        variant="accent"
        onPress={() =>
          router.replace("/lecturer/(tabs)/dashboard" as never)
        }
      />

      <Spacer size="lg" />
    </ScreenShell>
  );
}
