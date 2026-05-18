import type { ReactNode } from "react";

import { Chip, type ChipVariant } from "@/components/ui/Chip";
import { Row } from "@/components/ui/Stack";

export type NavChipItem = {
  key: string;
  label: string;
  onPress: () => void;
  variant?: ChipVariant;
};

/** Horizontal navigation chips (e.g. student dashboard quick links) */
export function NavChipBar({ items }: { items: NavChipItem[] }) {
  return (
    <Row wrap gap="sm">
      {items.map((item) => (
        <Chip key={item.key} label={item.label} onPress={item.onPress} variant={item.variant ?? "outline"} />
      ))}
    </Row>
  );
}

export function ChipSelectGroup<T extends string>({
  options,
  value,
  onChange,
  capitalize,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  capitalize?: boolean;
}) {
  return (
    <Row wrap gap="sm">
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          selected={value === opt}
          onPress={() => onChange(opt)}
          capitalize={capitalize}
        />
      ))}
    </Row>
  );
}

export function ChipPicker({
  children,
}: {
  children: ReactNode;
}) {
  return <Row wrap gap="sm">{children}</Row>;
}
