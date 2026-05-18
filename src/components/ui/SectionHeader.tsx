import { AppText } from "@/components/ui/AppText";

export function SectionHeader({
  title,
  overline,
}: {
  title: string;
  overline?: boolean;
}) {
  return <AppText variant={overline ? "overline" : "heading"} style={{ marginBottom: 10 }}>{title}</AppText>;
}
