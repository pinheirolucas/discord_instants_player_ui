import { SLOT_COUNT } from "../lib/slot";
import type { ResolvedMode, ThemeId } from "../themes";
import "./appearance.css";

export interface ThemeSwatchProps {
  theme: ThemeId;
  mode: ResolvedMode;
}

/**
 * A palette drawn as a tiny window — ground, line, title, accent and all six
 * card slots — in whatever palette it is given, regardless of the one the
 * page is on. It stamps its own data-theme/data-mode, which works because
 * tokens.css declares every token, slot fills included, on the themed
 * element itself: the nearest themed ancestor wins by inheritance.
 *
 * Decorative: whatever holds it carries the name.
 */
export function ThemeSwatch({ theme, mode }: ThemeSwatchProps) {
  return (
    <span className="tsw" data-theme={theme} data-mode={mode} aria-hidden="true">
      <span className="tsw-bar">
        <span className="tsw-title" />
        <span className="tsw-pill" />
      </span>
      <span className="tsw-slots">
        {Array.from({ length: SLOT_COUNT }, (_, i) => (
          <span key={i} className={`p${i}`} />
        ))}
      </span>
    </span>
  );
}
