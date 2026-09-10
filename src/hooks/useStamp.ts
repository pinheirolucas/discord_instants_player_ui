import { useEffect } from "react";

/** Writes one data-* attribute on <html>, muting component transitions for
 *  the frames around the write so the whole window repaints as one instead
 *  of shimmering at each element's own duration. */
export function useStamp(name: "mode" | "theme" | "os", value: string): void {
  useEffect(() => {
    const root = document.documentElement;

    if (root.dataset[name] === value) {
      return;
    }

    root.dataset.themeSwitching = "";
    root.dataset[name] = value;

    const id = requestAnimationFrame(() => {
      delete root.dataset.themeSwitching;
    });

    return () => cancelAnimationFrame(id);
  }, [name, value]);
}
