import { useRouter, useLocalSearchParams } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { TestInvigilatePanel } from "@/components/invigilation/TestInvigilatePanel";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function TutorTestInvigilateScreen() {
  useRoleGuard("tutor");
  const { testSessionId } = useLocalSearchParams() as { testSessionId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== "tutor") return null;

  return (
    <ScreenShell title="Invigilate test" showBack>
      <TestInvigilatePanel
        testSessionId={String(testSessionId)}
        personId={user.studentId}
        role="tutor"
        isLecturer={false}
        onRegisterReady={(id) =>
          router.push(`/lecturer/register/${id}?type=test` as never)
        }
      />
    </ScreenShell>
  );
}
