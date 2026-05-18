import { View } from "react-native";

import { AppCard, AppText, Avatar, KeyValueRow, ScreenShell } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { mockDB } from "@/mockDB/mockDBService";

export function StudentProfileContent({ showBack }: { showBack?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const stu = user?.role === "student" ? mockDB.read("students", user.id) : null;
  const faculty = stu ? mockDB.read("faculties", stu.facultyId) : null;
  const course = stu ? mockDB.read("courses", stu.courseId) : null;

  return (
    <ScreenShell title="Profile" subtitle="Your enrolment and device binding" showBack={showBack}>
      {user?.role === "student" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <Avatar name={user.fullName} size={56} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{user.fullName}</AppText>
            <AppText variant="caption" style={{ marginTop: 4 }}>
              {user.email}
            </AppText>
          </View>
        </View>
      ) : null}

      <AppCard>
        <KeyValueRow label="Student number" value={stu?.studentNumber ?? "—"} />
        <KeyValueRow label="Faculty" value={faculty?.facultyName ?? "—"} />
        <KeyValueRow label="Course" value={course?.courseName ?? "—"} />
        <KeyValueRow label="Device" value={stu?.deviceId ?? "—"} />
      </AppCard>

      <AppText variant="caption" style={{ marginTop: 16 }}>
        Attendance is tied to this device in production. Contact ICT if you replace your phone.
      </AppText>
    </ScreenShell>
  );
}
