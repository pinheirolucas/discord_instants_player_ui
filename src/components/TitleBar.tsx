import { AppMarkIcon } from "../icons";
import type { PlatformId } from "../themes";
import "./titlebar.css";

/**
 * The drag row under the OS-drawn window controls. The traffic lights and
 * caption buttons are the real ones, drawn by the OS — the design canvas
 * draws fakes only because a static artboard has no OS to ask. Linux keeps
 * the window manager's own bar, and a browser tab has neither, so this is
 * only rendered under Electron on macOS and Windows.
 *
 * aria-hidden: the window already has a title, and nothing here is
 * interactive.
 */
export function TitleBar({ os }: { os: PlatformId }) {
  return (
    <div className="tb" aria-hidden="true">
      {os === "win" && (
        <span className="wtitle">
          <AppMarkIcon />
          Discord Instants Player
        </span>
      )}
    </div>
  );
}
