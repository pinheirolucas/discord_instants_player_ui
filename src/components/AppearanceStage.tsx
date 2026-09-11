import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { fitFrame } from "../lib/fit";
import type { Fit } from "../lib/fit";
import "./appearance.css";

/** Backdrop left showing around the staged app. */
const PAD = 20;

export interface AppearanceStageProps {
  open: boolean;
  children: ReactNode;
}

/**
 * Holds the app. Closed, it is invisible: the frame fills it and the app lays
 * out exactly as it always has. Open, the frame keeps the size the app had —
 * the stage's width, and its height down to the bottom of the window, since
 * the dock is what the stage lost — and is scaled and centred into what is
 * left. The children never remount, so a search, a loaded MyInstants page
 * or a playing clip all survive a trip through Aparência.
 *
 * Measured in a layout effect, so the first open frame is already fitted and
 * the transition runs from full size rather than jumping.
 */
export function AppearanceStage({ open, children }: AppearanceStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (!open || !stage) {
      setFit(null);
      return undefined;
    }

    function measure() {
      const box = stage!.getBoundingClientRect();
      const bottom = stage!.parentElement?.getBoundingClientRect().bottom ?? box.bottom;
      setFit(fitFrame(box, { width: box.width, height: bottom - box.top }, PAD));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const style: CSSProperties | undefined = fit
    ? {
        width: fit.width,
        height: fit.height,
        transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})`
      }
    : undefined;

  return (
    <div ref={stageRef} className="stage" data-open={open}>
      <div className="frame" style={style}>
        {children}
      </div>
    </div>
  );
}
