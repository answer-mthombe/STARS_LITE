import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppTabBar } from "@/components/navigation/AppTabBar";
import { TabBarInsetContext } from "@/contexts/TabBarInsetContext";
import { ROLE_TABS } from "@/navigation/roleTabs";
import { getTabBarHeight } from "@/navigation/tabBarMetrics";
import type { InstitutionRole } from "@/types/roles";
import { colors } from "@/theme";

export function RoleTabsLayout({ role }: { role: InstitutionRole }) {
  const tabs = ROLE_TABS[role];
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);

  return (
    <TabBarInsetContext.Provider value={tabBarHeight}>
      <Tabs
        tabBar={(props: BottomTabBarProps) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.palette.accent,
          tabBarInactiveTintColor: colors.ink.subtle,
          tabBarStyle: {
            height: tabBarHeight,
            borderTopWidth: 0,
            elevation: 0,
          },
        }}
      >
        {tabs.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarLabel: t.title,
            }}
          />
        ))}
      </Tabs>
    </TabBarInsetContext.Provider>
  );
}
