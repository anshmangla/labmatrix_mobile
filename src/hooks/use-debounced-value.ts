import { useEffect, useState } from "react";

/**
 * Returns `value` once it has stopped changing for `delayMs`, so typing in a search box
 * sends one request instead of one per keystroke. Clearing to an empty string applies at once.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return value === "" ? value : debounced;
}
