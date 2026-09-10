import * as RadixSwitch from "@radix-ui/react-switch";
import "./controls.css";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id?: string;
}

/** Radix reports role="switch", same as MUI's did, so existing test queries
 *  that ask for getByRole("switch") keep working. */
export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  return (
    <label className="opt">
      <RadixSwitch.Root
        id={id}
        className="sw"
        checked={checked}
        onCheckedChange={onCheckedChange}
      >
        <RadixSwitch.Thumb className="thumb" />
      </RadixSwitch.Root>
      {label}
    </label>
  );
}
