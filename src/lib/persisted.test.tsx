import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createPersistedState } from "./persisted";

const useCount = createPersistedState<number>("count");

function Reader({ label }: { label: string }) {
  const [count] = useCount(0);
  return <p>{`${label}:${count}`}</p>;
}

let setFromWriter: (next: number | ((n: number) => number)) => void = () => {};

function Writer() {
  const [count, setCount] = useCount(0);
  setFromWriter = setCount;
  return <p>{`writer:${count}`}</p>;
}

afterEach(() => localStorage.clear());

describe("createPersistedState", () => {
  it("reads what is already stored, JSON-decoded", () => {
    localStorage.setItem("count", "7");
    render(<Reader label="r" />);
    expect(screen.getByText("r:7")).toBeInTheDocument();
  });

  it("falls back to the default when the stored value is not JSON", () => {
    localStorage.setItem("count", "{nope");
    render(<Reader label="r" />);
    expect(screen.getByText("r:0")).toBeInTheDocument();
  });

  it("writes through to localStorage as JSON", () => {
    render(<Writer />);
    act(() => setFromWriter(3));
    expect(localStorage.getItem("count")).toBe("3");
  });

  // The case use-persisted-state covered and a storage-event-only version
  // does not: the storage event never fires in the window that wrote, so
  // without the in-window registry an import would leave the favourites grid
  // stale until it remounted.
  it("keeps every hook on the same key in step within one window", () => {
    render(
      <>
        <Writer />
        <Reader label="a" />
        <Reader label="b" />
      </>
    );

    act(() => setFromWriter(5));

    expect(screen.getByText("writer:5")).toBeInTheDocument();
    expect(screen.getByText("a:5")).toBeInTheDocument();
    expect(screen.getByText("b:5")).toBeInTheDocument();
  });

  it("resolves functional updates against the latest value", () => {
    render(<Writer />);
    act(() => {
      setFromWriter((n) => n + 1);
      setFromWriter((n) => n + 1);
    });
    expect(screen.getByText("writer:2")).toBeInTheDocument();
  });

  it("picks up a write made by another window", () => {
    render(<Reader label="r" />);
    act(() => {
      localStorage.setItem("count", "9");
      window.dispatchEvent(
        new StorageEvent("storage", { key: "count", newValue: "9", storageArea: localStorage })
      );
    });
    expect(screen.getByText("r:9")).toBeInTheDocument();
  });
});
