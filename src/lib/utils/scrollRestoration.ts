const SCROLL_STORAGE_PREFIX = "work-knowledge-journal:scroll:";

function createScrollKey(key: string): string {
  return `${SCROLL_STORAGE_PREFIX}${key}`;
}

function readScrollPosition(key: string): number | null {
  const storageKey = createScrollKey(key);
  const savedValue = sessionStorage.getItem(storageKey);

  if (!savedValue) {
    return null;
  }

  const scrollY = Number(savedValue);

  if (!Number.isFinite(scrollY)) {
    sessionStorage.removeItem(storageKey);
    return null;
  }

  return scrollY;
}

function scrollToPosition(scrollY: number): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    });
  });
}

export function saveScrollPosition(key: string): void {
  sessionStorage.setItem(createScrollKey(key), String(window.scrollY));
}

export function restoreScrollPosition(key: string): void {
  const scrollY = readScrollPosition(key);

  if (scrollY === null) {
    return;
  }

  scrollToPosition(scrollY);
}

export function consumeScrollPosition(key: string): boolean {
  const scrollY = readScrollPosition(key);

  if (scrollY === null) {
    return false;
  }

  sessionStorage.removeItem(createScrollKey(key));
  scrollToPosition(scrollY);

  return true;
}

export function clearScrollPosition(key: string): void {
  sessionStorage.removeItem(createScrollKey(key));
}
