import * as RadixDialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import type { ColorMode, ResolvedMode, ThemeId } from "../themes";
import { Button } from "./Button";
import { SegmentedChoice } from "./Segmented";
import { ThemePicker } from "./ThemePicker";
import "./appearance.css";

const MODES: { value: ColorMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" }
];

export interface AppearanceDockProps {
  theme: ThemeId;
  mode: ColorMode;
  /** The mode the swatches show: `mode`, with auto resolved against the OS. */
  resolved: ResolvedMode;
  onThemeChange: (theme: ThemeId) => void;
  onModeChange: (mode: ColorMode) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The Aparência shell's bar: title, mode, Cancelar/Pronto, and the palettes.
 *
 * A modal dialog that is deliberately not portaled — it renders in place,
 * under the app it restyles. Radix's modal behaviour does the rest: focus
 * stays in the dock, Escape cancels, and everything outside it, the staged
 * app included, is hidden from assistive tech and from the pointer, so the
 * preview cannot be clicked into opening a second dialog on top of the
 * shell. A click on the stage does nothing rather than cancelling: backing
 * out of a half-made choice should take an explicit Cancelar or Escape.
 */
export function AppearanceDock({
  theme,
  mode,
  resolved,
  onThemeChange,
  onModeChange,
  onCancel,
  onConfirm
}: AppearanceDockProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  return (
    <RadixDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <RadixDialog.Content
        className="dock"
        aria-describedby={undefined}
        // Start on the palette in use: that is the choice this shell exists
        // for, and the arrow keys walk the strip from there.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          pickerRef.current?.querySelector<HTMLElement>('[data-state="checked"]')?.focus();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="dhead">
          <RadixDialog.Title asChild>
            <h2>Aparência</h2>
          </RadixDialog.Title>
          <SegmentedChoice aria-label="Modo" value={mode} onChange={onModeChange} options={MODES} />
          <span className="spacer" />
          <div className="dact">
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={onConfirm}>Pronto</Button>
          </div>
        </div>
        <ThemePicker ref={pickerRef} value={theme} onChange={onThemeChange} mode={resolved} />
      </RadixDialog.Content>
    </RadixDialog.Root>
  );
}
