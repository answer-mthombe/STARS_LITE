import { useRouter } from "expo-router";

import { AppText, ListPressableItem, SectionHeader, Stack } from "@/components/ui";
import { ROLE_HUB_NAV } from "@/navigation/roleNavigation";
import type { InstitutionRole } from "@/types/roles";

export function RoleQuickNav({ role, title = "Quick navigation" }: { role: InstitutionRole; title?: string }) {
  const router = useRouter();
  const links = ROLE_HUB_NAV[role] ?? [];
  if (links.length === 0) return null;

  return (
    <Stack gap="sm">
      <SectionHeader title={title} />
      {links.map((link) => (
        <ListPressableItem
          key={link.href + link.label}
          title={link.label}
          subtitle={link.description}
          onPress={() => router.push(link.href as never)}
        />
      ))}
      <AppText variant="caption">Tap a destination — bottom tabs stay available on main screens.</AppText>
    </Stack>
  );
}
