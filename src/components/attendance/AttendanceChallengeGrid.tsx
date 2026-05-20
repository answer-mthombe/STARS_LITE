import { Pressable, Text, View } from "react-native";

import type { ChallengeObject } from "@/services/attendanceChallengeService";
import { colors } from "@/theme";

function shapeGlyph(shape: ChallengeObject["shape"]): string {
  switch (shape) {
    case "circle":
      return "●";
    case "square":
      return "■";
    case "triangle":
      return "▲";
    case "star":
      return "★";
    case "diamond":
      return "◆";
    case "hexagon":
      return "⬢";
    case "cross":
      return "✚";
    case "arrow":
      return "➤";
  }
}

function colorHex(c: ChallengeObject["color"]): string {
  switch (c) {
    case "red":
      return "#c0392b";
    case "blue":
      return "#2980b9";
    case "green":
      return "#27ae60";
    case "yellow":
      return "#f1c40f";
    case "purple":
      return "#8e44ad";
    case "orange":
      return "#e67e22";
    case "white":
      return "#ffffff";
    case "teal":
      return "#16a085";
  }
}

function sizePx(s: ChallengeObject["size"]): number {
  switch (s) {
    case "small":
      return 22;
    case "medium":
      return 28;
    case "large":
      return 34;
  }
}

function patternLabel(p: ChallengeObject["pattern"]): string {
  switch (p) {
    case "solid":
      return "SOLID";
    case "outline":
      return "OUTLINE";
    case "striped":
      return "STRIPED";
    case "dotted":
      return "DOTTED";
    case "half":
      return "HALF";
  }
}

export function AttendanceChallengeGrid(props: {
  objects: ChallengeObject[];
  disabled?: boolean;
  onPressCell: (idx: number) => void;
}) {
  const cells = props.objects.slice(0, 6);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
      {cells.map((o, idx) => (
        <Pressable
          key={idx}
          disabled={props.disabled}
          onPress={() => props.onPressCell(idx)}
          style={{
            width: "31.5%",
            aspectRatio: 1,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            backgroundColor: colors.surface.soft,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: sizePx(o.size), color: colorHex(o.color), fontWeight: "900" }}>{shapeGlyph(o.shape)}</Text>
          <Text style={{ fontSize: 10, color: colors.ink.muted, fontWeight: "800" }}>{patternLabel(o.pattern)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

