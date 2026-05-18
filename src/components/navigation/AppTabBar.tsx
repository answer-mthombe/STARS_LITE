import { View, Pressable } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { ROLE_TABS } from "@/navigation/roleTabs";
import { getTabBarHeight, getTabBarPaddingBottom, TAB_BAR_CONTENT_HEIGHT } from "@/navigation/tabBarMetrics";
import { colors } from "@/theme";

function iconForRoute(routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap {
  for (const tabs of Object.values(ROLE_TABS)) {
    const t = tabs.find((tab) => tab.name === routeName);
    if (t) return (focused ? t.iconFocused : t.icon) as keyof typeof Ionicons.glyphMap;
  }
  return focused ? "ellipse" : "ellipse-outline";
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const barHeight = getTabBarHeight(insets.bottom);
  const paddingBottom = getTabBarPaddingBottom(insets.bottom);

  return (
    <View
      style={{
        flexDirection: "row",
        height: barHeight,
        backgroundColor: colors.surface.base,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        paddingBottom,
        paddingTop: 6,
        paddingHorizontal: 4,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : typeof options.title === "string"
              ? options.title
              : route.name;

        const focused = state.index === index;
        const color = focused ? colors.palette.accent : colors.ink.subtle;
        const iconName = iconForRoute(route.name, focused);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "flex-start",
              minHeight: TAB_BAR_CONTENT_HEIGHT - 8,
              paddingVertical: 2,
            }}
          >
            <Ionicons name={iconName} size={21} color={color} />
            <AppText
              variant="caption"
              color={color}
              style={{ marginTop: 2, fontSize: 9, fontWeight: focused ? "800" : "600" }}
              numberOfLines={1}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
