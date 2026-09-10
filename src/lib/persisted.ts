import { useCallback, useEffect, useRef, useState } from "react";

// Drop-in replacement for use-persisted-state, which is unmaintained and
// ships no types. Same [value, setValue] shape and same JSON encoding, so
// exported backups stay readable, plus the one feature of the package that
// actually mattered here: two windows of the app share localStorage, and
// without a storage listener the second one shows stale favourites until
// it is reloaded.

type Updater<T> = T | ((previous: T) => T);
export type SetPersisted<T> = (next: Updater<T>) => void;

function parse<T>(raw: string | null, fallback: T): T {
  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    return parse(window.localStorage.getItem(key), fallback);
  } catch {
    // Private mode, or storage disabled entirely.
    return fallback;
  }
}

export function createPersistedState<T>(key: string) {
  return function usePersistedState(defaultValue: T): [T, SetPersisted<T>] {
    const [value, setValue] = useState<T>(() => read(key, defaultValue));

    // Held in a ref so an inline default — useInstantsState([]) — does not
    // resubscribe the storage listener on every render.
    const fallback = useRef(defaultValue);
    fallback.current = defaultValue;

    const set = useCallback<SetPersisted<T>>((next) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(previous) : next;

        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Nothing useful to do: keep the in-memory value so the session
          // still works, and let the next write try again.
        }

        return resolved;
      });
    }, []);

    useEffect(() => {
      function onStorage(event: StorageEvent) {
        if (event.key !== key || event.storageArea !== window.localStorage) {
          return;
        }

        setValue(parse(event.newValue, fallback.current));
      }

      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }, []);

    return [value, set];
  };
}
