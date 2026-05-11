import { Text, View } from "react-native";

import { colors } from "@/theme";

const LETTERS = ["S", "T", "A", "R", "S"] as const;

export function StarsWordmark({ large = false }: { large?: boolean }) {
  const fontSize = large ? 44 : 22;
  const letterSpacing = large ? 6 : 3;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: large ? 4 : 2 }}>
      {LETTERS.map((ch, i) => {
        const useAccent = i % 2 === 0;
        return (
          <Text
            key={`${ch}-${i}`}
            style={{
              fontSize,
              fontWeight: "900",
              letterSpacing,
              color: useAccent ? colors.palette.accent : colors.palette.primary,
              ...(large
                ? {
                    textShadowColor: "rgba(11,15,20,0.08)",
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 8,
                  }
                : {}),
            }}
          >
            {ch}
          </Text>
        );
      })}
    </View>
  );
}
