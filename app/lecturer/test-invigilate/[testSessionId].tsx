import { useRouter, useLocalSearchParams } from "expo-router";

import { ScreenShell } from "@/components/ui/ScreenShell";
import { TestInvigilatePanel } from "@/components/invigilation/TestInvigilatePanel";
import { useAuthStore } from "@/store/authStore";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function LecturerTestInvigilateScreen() {
  useRoleGuard("lecturer");
  const { testSessionId } = useLocalSearchParams() as { testSessionId: string };
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== "lecturer") return null;

  return (
    <ScreenShell title="Test invigilation" showBack>
      <TestInvigilatePanel
        testSessionId={String(testSessionId)}
        personId={user.id}
        role="lecturer"
        isLecturer
        onRegisterReady={(id) =>
          router.push(`/lecturer/register/${id}?type=test` as never)
        }
      />
    </ScreenShell>
  );
}
