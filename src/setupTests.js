// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom/vitest";

// jsdom implements no matchMedia at all. useColorMode reads it on every
// mount to resolve "auto" against the OS, so without this every test that
// renders <App /> dies on `window.matchMedia is not a function`.
//
// Defaults to light. A test that needs the dark branch can replace the
// implementation with one whose `matches` is true.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  });
}
