import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { colors, radius } from "@/theme";

export function SessionTimer({ expiresAtIso }: { expiresAtIso: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const end = new Date(expiresAtIso).getTime();
      const ms = Math.max(0, end - Date.now());
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtIso]);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: "rgba(79,26,29,0.10)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.palette.primary,
      }}
    >
      <Text style={{ color: colors.palette.primary, fontWeight: "900", fontSize: 13 }}>Ends in {left}</Text>
    </View>
  );
}
