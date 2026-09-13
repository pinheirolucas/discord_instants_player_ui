// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";

if (typeof navigator !== "undefined" && navigator.language !== "pt-BR") {
  Object.defineProperty(navigator, "language", { value: "pt-BR", configurable: true });
}

import i18n from "./i18n";
await i18n.changeLanguage("pt-BR");

// jsdom implements no matchMedia at all. useColorMode reads it on every
// mount to resolve "auto" against the OS, so without this every test that
// renders <App /> dies on `window.matchMedia is not a function`.
//
// Defaults to light. A test that needs the dark branch can replace the
// implementation with one whose `matches` is true.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })) as typeof window.matchMedia;
}

// Radix measures, positions and captures pointers with browser APIs jsdom
// does not implement: menus and tooltips observe their anchor's size,
// focused items scroll into view, and triggers probe pointer capture on
// whatever element received the pointerdown — which can be an <svg> inside
// a button, hence Element rather than HTMLElement.
if (typeof window !== "undefined") {
  if (!("ResizeObserver" in window)) {
    (window as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  const proto = window.Element.prototype as unknown as Record<string, unknown>;
  const stubs: Record<string, () => unknown> = {
    scrollIntoView: () => {},
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  };

  for (const [name, stub] of Object.entries(stubs)) {
    if (typeof proto[name] !== "function") {
      proto[name] = stub;
    }
  }
}
