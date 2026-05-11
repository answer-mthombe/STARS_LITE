import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius } from "@/theme";

export function AppInput({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: colors.palette.accent, fontWeight: "800" }}>{label}</Text> : null}
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
      {error ? <Text style={{ color: colors.palette.primary, fontWeight: "700" }}>{error}</Text> : null}
    </View>
  );
}

