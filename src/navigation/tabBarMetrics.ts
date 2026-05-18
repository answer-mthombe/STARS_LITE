/** Visible tab row (icons + labels) */
export const TAB_BAR_CONTENT_HEIGHT = 52;

/** Extra space above the system gesture / home indicator */
export const TAB_BAR_EXTRA_BOTTOM = 18;

export function getTabBarPaddingBottom(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, 8) + TAB_BAR_EXTRA_BOTTOM;
}

export function getTabBarHeight(safeAreaBottom: number): number {
  return TAB_BAR_CONTENT_HEIGHT + getTabBarPaddingBottom(safeAreaBottom);
}
