import { useMemo } from "react";

import { AppCard, AppText, DividerListRow, ScreenShell, SectionHeader, Spacer, Stack } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { auditLogScopeDescription, listAuditLogsForUser } from "@/services/auditLogService";
import { useMockDbVersionStore } from "@/store/mockDbVersionStore";
import type { InstitutionRole } from "@/types/roles";

const ROLE_TITLES: Record<InstitutionRole, string> = {
  admin: "University audit log",
  dean: "Faculty audit log",
  hod: "Department audit log",
  lecturer: "Module audit log",
  tutor: "Activity log",
  student: "Activity log",
};

export function AuditLogScreen({ role }: { role: Extract<InstitutionRole, "admin" | "dean" | "hod" | "lecturer"> }) {
  const user = useAuthStore((s) => s.user);
  const v = useMockDbVersionStore((s) => s.version);

  const logs = useMemo(() => {
    if (!user) return [];
    return listAuditLogsForUser(user);
  }, [user, v]);

  return (
    <ScreenShell title={ROLE_TITLES[role]} subtitle={auditLogScopeDescription(role)} scroll>
      <AppCard>
        <SectionHeader title="How to read entries" />
        <AppText variant="body">
          Each row is append-only: who acted, what changed, and which module or scope was affected. Production
          Supabase RLS policies will mirror the same filters shown here.
        </AppText>
      </AppCard>

      <Spacer size="md" />

      {logs.length === 0 ? (
        <AppCard>
          <AppText variant="bodyStrong">No events in scope</AppText>
          <AppText variant="caption" style={{ marginTop: 6 }}>
            Re-seed demo data from Admin → Data, or run a class session to generate entries.
          </AppText>
        </AppCard>
      ) : (
        <Stack gap="sm">
          {logs.map((row) => (
            <AppCard key={row.id}>
              <AppText variant="bodyStrong">{row.actionLabel}</AppText>
              <AppText variant="caption" style={{ marginTop: 4 }}>
                {new Date(row.createdAt).toLocaleString()} · {row.actorRole}
              </AppText>
              <Spacer size="sm" />
              <DividerListRow left="Actor" right={row.actorLabel} />
              {row.scopeLabel ? <DividerListRow left="Scope" right={row.scopeLabel} /> : null}
              {row.targetPersonId ? (
                <DividerListRow left="Target" right={row.targetPersonId} />
              ) : null}
            </AppCard>
          ))}
        </Stack>
      )}
    </ScreenShell>
  );
}
