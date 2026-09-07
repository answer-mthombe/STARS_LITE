/**
 * STARS shared UI kit — import from `@/components/ui` for consistent buttons, type, and layout.
 *
 * @example
 * import { AppButton, AppText, ScreenShell, Chip, Stack } from "@/components/ui";
 */

export { AppButton, type AppButtonVariant, type AppButtonSize } from "./AppButton";
export { AppText, type AppTextVariant } from "./AppText";
export { AppInput } from "./AppInput";
export { AppCard } from "./AppCard";
export { Avatar } from "./Avatar";
export { AttendanceCard } from "./AttendanceCard";
export { Badge } from "./Badge";
export { Chip, type ChipVariant } from "./Chip";
export { ChipSelectGroup, ChipPicker, NavChipBar, type NavChipItem } from "./NavChipBar";
export { DelegationBadge } from "./DelegationBadge";
export { EmptyState } from "./EmptyState";
export { FloatingActionButton } from "./FloatingActionButton";
export { Header } from "./Header";
export { InnovationLabFooter } from "./InnovationLabFooter";
export { KeyValueRow } from "./KeyValueRow";
export { LinkText, SignOutLink } from "./LinkText";
export {
  ListPressableItem,
  PromoBanner,
  DividerListRow,
} from "./ListPressableItem";
export { LoadingSpinner } from "./LoadingSpinner";
export { ModuleCard } from "./ModuleCard";
export { RoleScopeCard } from "./RoleScopeCard";
export { ScreenShell } from "./ScreenShell";
export { SectionHeader } from "./SectionHeader";
export { SessionTimer } from "./SessionTimer";
export { Stack, Row, Spacer } from "./Stack";
export { StatTile, HighlightStat } from "./StatTile";
export { StarsWordmark } from "./StarsWordmark";
export { ToastNotification } from "./ToastNotification";

// Note: navigation components (LogoutButton, MoreMenuScreen) are imported directly
// from "@/components/navigation/*". Re-exporting them here created a require cycle
// (ui/index -> MoreMenuScreen -> ui/index) with no consumers, so they were removed.
