import * as RadixRadio from "@radix-ui/react-radio-group";
import { forwardRef } from "react";
import { THEMES, isThemeId } from "../themes";
import type { ResolvedMode, ThemeId } from "../themes";
import { ThemeSwatch } from "./ThemeSwatch";
import "./appearance.css";

export interface ThemePickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  /** Which half of each palette the swatches show. */
  mode: ResolvedMode;
}

/**
 * The eight palettes as one radio group: arrow keys move and pick, the way a
 * filmstrip reads. Each option is named by its visible label; the palette's
 * description rides along as a tooltip.
 */
export const ThemePicker = forwardRef<HTMLDivElement, ThemePickerProps>(function ThemePicker(
  { value, onChange, mode },
  ref
) {
  return (
    <RadixRadio.Root
      ref={ref}
      className="tpick"
      aria-label="Tema"
      orientation="horizontal"
      value={value}
      onValueChange={(next) => {
        if (isThemeId(next)) {
          onChange(next);
        }
      }}
    >
      {THEMES.map((theme) => (
        <RadixRadio.Item key={theme.id} value={theme.id} className="topt" title={theme.desc}>
          <span className="tring">
            <ThemeSwatch theme={theme.id} mode={mode} />
          </span>
          <span className="tname">{theme.name}</span>
        </RadixRadio.Item>
      ))}
    </RadixRadio.Root>
  );
});
