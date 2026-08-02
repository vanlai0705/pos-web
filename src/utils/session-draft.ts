export type SessionDraftStorage<T> = {
  read: () => T | null;
  write: (value: T) => void;
  clear: () => void;
};

export function createSessionDraftStorage<T>(key: string): SessionDraftStorage<T> {
  const read = () => {
    if (typeof window === "undefined") return null;

    try {
      const raw = window.sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  };

  const write = (value: T) => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures.
    }
  };

  const clear = () => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  };

  return { read, write, clear };
}
