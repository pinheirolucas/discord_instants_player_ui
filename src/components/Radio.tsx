import * as RadixRadio from "@radix-ui/react-radio-group";
import "./controls.css";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  "aria-label": string;
}

export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel
}: RadioGroupProps<T>) {
  return (
    <RadixRadio.Root
      value={value}
      onValueChange={(next) => onChange(next as T)}
      aria-label={ariaLabel}
      style={{ display: "flex", gap: 20 }}
    >
      {options.map((option) => (
        <label className="opt" key={option.value}>
          <RadixRadio.Item className="rd" value={option.value}>
            <RadixRadio.Indicator className="ind" />
          </RadixRadio.Item>
          {option.label}
        </label>
      ))}
    </RadixRadio.Root>
  );
}
