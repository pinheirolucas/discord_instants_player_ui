import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import "./controls.css";

// The pill pair in the hero is a real tablist: Radix gives roving arrow-key
// focus and the tab -> tabpanel aria wiring for free. That wiring only
// exists inside one Root, and the pills and the panel they switch sit far
// apart in the shell — so the Root is its own export, wrapped around both.

export interface SegmentedRootProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
  className?: string;
}

export function SegmentedRoot<T extends string>({
  value,
  onChange,
  children,
  className
}: SegmentedRootProps<T>) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onChange(next as T)}
      className={className}
    >
      {children}
    </Tabs.Root>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  "aria-label": string;
}

export function Segmented<T extends string>({
  options,
  "aria-label": ariaLabel
}: SegmentedProps<T>) {
  return (
    <Tabs.List className="seg" aria-label={ariaLabel}>
      {options.map((option) => (
        <Tabs.Trigger key={option.value} value={option.value} data-tab={option.value}>
          {option.label}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
  );
}

export const SegmentedPanel = Tabs.Content;
