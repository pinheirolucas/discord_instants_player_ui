import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import "./overlays.css";

export interface MenuProps {
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
}

export function Menu({ trigger, open, onOpenChange, children, align = "end" }: MenuProps) {
  return (
    <RadixMenu.Root open={open} onOpenChange={onOpenChange}>
      <RadixMenu.Trigger asChild>{trigger}</RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content className="menu" align={align} sideOffset={6}>
          {children}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export interface MenuItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  tick?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
}

export function MenuItem({ onSelect, disabled, tick, primary, secondary }: MenuItemProps) {
  return (
    <RadixMenu.Item className="mitem" onSelect={onSelect} disabled={disabled}>
      {tick !== undefined && <span className="mtick">{tick}</span>}
      <span>
        {primary}
        {secondary && <span className="msub">{secondary}</span>}
      </span>
    </RadixMenu.Item>
  );
}

export function MenuSeparator() {
  return <RadixMenu.Separator className="msep" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <RadixMenu.Label className="mlabel">{children}</RadixMenu.Label>;
}
