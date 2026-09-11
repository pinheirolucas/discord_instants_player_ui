import { describe, expect, it } from "vitest";
import { fitFrame } from "./fit";

describe("fitFrame", () => {
  it("scales the app down to the stage's height when that is the tighter side", () => {
    // A 1280x798 window whose dock leaves a 1280x610 stage.
    const fit = fitFrame({ width: 1280, height: 610 }, { width: 1280, height: 798 }, 20);

    expect(fit?.scale).toBeCloseTo(570 / 798);
    expect(fit?.width).toBe(1280);
    expect(fit?.height).toBe(798);
  });

  it("scales to the width when the stage is narrow", () => {
    const fit = fitFrame({ width: 600, height: 900 }, { width: 1000, height: 700 }, 20);

    expect(fit?.scale).toBeCloseTo(560 / 1000);
  });

  it("centres the scaled app on the stage", () => {
    const fit = fitFrame({ width: 1280, height: 610 }, { width: 1280, height: 798 }, 20);
    const scale = fit?.scale ?? 0;

    expect(fit?.x).toBeCloseTo((1280 - 1280 * scale) / 2);
    expect(fit?.y).toBeCloseTo(20);
  });

  it("never scales up", () => {
    expect(fitFrame({ width: 3000, height: 3000 }, { width: 800, height: 600 }, 20)?.scale).toBe(1);
  });

  it("gives up while either box has no size, rather than collapsing the app", () => {
    expect(fitFrame({ width: 0, height: 0 }, { width: 1280, height: 798 }, 20)).toBeNull();
    expect(fitFrame({ width: 1280, height: 610 }, { width: 0, height: 0 }, 20)).toBeNull();
    expect(fitFrame({ width: 30, height: 30 }, { width: 1280, height: 798 }, 20)).toBeNull();
  });
});
