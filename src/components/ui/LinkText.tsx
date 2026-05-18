import { Pressable } from "react-native";

import { AppText, type AppTextVariant } from "@/components/ui/AppText";

export function LinkText({
  children,
  onPress,
  variant = "link",
}: {
  children: string;
  onPress?: () => void;
  variant?: Extract<AppTextVariant, "link" | "linkMuted">;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} hitSlop={8} style={{ paddingVertical: 8 }}>
      <AppText variant={variant}>{children}</AppText>
    </Pressable>
  );
}

export function SignOutLink({ onPress }: { onPress: () => void }) {
  return <LinkText onPress={onPress}>Sign out</LinkText>;
}
