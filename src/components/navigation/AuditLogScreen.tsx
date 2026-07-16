import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { AppCard, AppText, DividerListRow, ScreenShell, SectionHeader, Spacer, Stack } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { auditLogScopeDescription, listAuditLogsForUser, type AuditLogViewRow } from "@/services/auditLogService";
import type { InstitutionRole } from "@/types/roles";

const ROLE_TITLES: Record<InstitutionRole, string> = {
  admin: "University audit log",
  dean: "Faculty audit log",
  hod: "Department audit log",
  lecturer: "Module audit log",
  tutor: "Activity log",
  student: "Activity log",
};

const PAGE_LIMIT = 20;

export function AuditLogScreen({ role }: { role: Extract<InstitutionRole, "admin" | "dean" | "hod" | "lecturer"> }) {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLogViewRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Core Data Fetcher
  async function loadAuditStream(isInitialFetch = true) {
    if (!user) return;
    try {
      if (isInitialFetch) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = isInitialFetch ? 0 : offset;
      const fetchedLogs = await listAuditLogsForUser(user, PAGE_LIMIT, currentOffset);

      if (isInitialFetch) {
        setLogs(fetchedLogs);
        setOffset(PAGE_LIMIT);
        setHasMore(fetchedLogs.length === PAGE_LIMIT);
      } else {
        setLogs((prev) => [...prev, ...fetchedLogs]);
        setOffset((prev) => prev + PAGE_LIMIT);
        setHasMore(fetchedLogs.length === PAGE_LIMIT);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit pipeline entries.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Reset offset and reload whenever the context scope shifts
  useEffect(() => {
    loadAuditStream(true);
  }, [user, role]);

  return (
    <ScreenShell title={ROLE_TITLES[role]} subtitle={auditLogScopeDescription(role)} scroll>
      <AppCard>
        <SectionHeader title="How to read entries" />
        <AppText variant="body">
          Each row is append-only: who acted, what changed, and which module or scope was affected. Production
          Supabase RLS policies mirror the exact boundaries verified here.
        </AppText>
      </AppCard>

      <Spacer size="md" />

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : error ? (
        <AppCard>
          <AppText variant="bodyStrong" style={{ color: "red" }}>System Sync Failure</AppText>
          <AppText variant="caption" style={{ marginTop: 6 }}>{error}</AppText>
        </AppCard>
      ) : logs.length === 0 ? (
        <AppCard>
          <AppText variant="bodyStrong">No events in scope</AppText>
          <AppText variant="caption" style={{ marginTop: 6 }}>
            There are no documented records mapped to this institutional level yet.
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

          {/* Pagination Interactive Controls */}
          <Spacer size="sm" />
          {loadingMore ? (
            <ActivityIndicator size="small" style={{ marginVertical: 12 }} />
          ) : hasMore ? (
            <TouchableOpacity 
              onPress={() => loadAuditStream(false)}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 14,
                backgroundColor: "rgba(0,0,0,0.03)",
                borderRadius: 8,
                marginBottom: 20
              }}
            >
              <AppText variant="bodyStrong" style={{ opacity: 0.7 }}>Load More Entries</AppText>
            </TouchableOpacity>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 12, marginBottom: 20 }}>
              <AppText variant="caption" style={{ opacity: 0.4 }}>End of Scoped Audit Log History</AppText>
            </View>
          )}
        </Stack>
      )}
    </ScreenShell>
  );
}


// export function AuditLogScreen({ role }: { role: Extract<InstitutionRole, "admin" | "dean" | "hod" | "lecturer"> }) {
//   const user = useAuthStore((s) => s.user);
//   const [logs, setLogs] = useState<AuditLogViewRow[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchRealScopedLogs() {
//       if (!user) return;
//       try {
//         setLoading(true);
//         setError(null);
//         const fetchedLogs = await listAuditLogsForUser(user, 50, 0);
//         setLogs(fetchedLogs);
//       } catch (err: any) {
//         setError(err.message || "Failed to load audit pipeline entries.");
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchRealScopedLogs();
//   }, [user, role]);

//   return (
//     <ScreenShell title={ROLE_TITLES[role]} subtitle={auditLogScopeDescription(role)} scroll>
//       <AppCard>
//         <SectionHeader title="How to read entries" />
//         <AppText variant="body">
//           Each row is append-only: who acted, what changed, and which module or scope was affected. Production
//           Supabase RLS policies mirror the exact boundaries verified here.
//         </AppText>
//       </AppCard>

//       <Spacer size="md" />

//       {loading ? (
//         <ActivityIndicator size="large" style={{ marginTop: 24 }} />
//       ) : error ? (
//         <AppCard>
//           <AppText variant="bodyStrong" style={{ color: "red" }}>System Sync Failure</AppText>
//           <AppText variant="caption" style={{ marginTop: 6 }}>{error}</AppText>
//         </AppCard>
//       ) : logs.length === 0 ? (
//         <AppCard>
//           <AppText variant="bodyStrong">No events in scope</AppText>
//           <AppText variant="caption" style={{ marginTop: 6 }}>
//             There are no documented records mapped to this institutional level yet.
//           </AppText>
//         </AppCard>
//       ) : (
//         <Stack gap="sm">
//           {logs.map((row) => (
//             <AppCard key={row.id}>
//               <AppText variant="bodyStrong">{row.actionLabel}</AppText>
//               <AppText variant="caption" style={{ marginTop: 4 }}>
//                 {new Date(row.createdAt).toLocaleString()} · {row.actorRole}
//               </AppText>
//               <Spacer size="sm" />
//               <DividerListRow left="Actor" right={row.actorLabel} />
//               {row.scopeLabel ? <DividerListRow left="Scope" right={row.scopeLabel} /> : null}
//               {row.targetPersonId ? (
//                 <DividerListRow left="Target" right={row.targetPersonId} />
//               ) : null}
//             </AppCard>
//           ))}
//         </Stack>
//       )}
//     </ScreenShell>
//   );
// }




// e568465f44c76dbf