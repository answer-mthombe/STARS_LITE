import { TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { colors, radius } from "@/theme";

export function AppInput({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        placeholderTextColor="rgba(39,49,58,0.55)"
        style={{
          backgroundColor: colors.surface.base,
          borderWidth: 1,
          borderColor: colors.palette.accent,
          borderRadius: radius.lg,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.ink.default,
          fontSize: 15,
        }}
        {...props}
      />
      {error ? (
        <AppText variant="label" color={colors.palette.primary}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
