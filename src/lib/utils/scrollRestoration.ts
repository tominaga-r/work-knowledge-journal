const SCROLL_STORAGE_PREFIX = "work-knowledge-journal:scroll:";

function createScrollKey(key: string): string {
  return `${SCROLL_STORAGE_PREFIX}${key}`;
}

export function saveScrollPosition(key: string): void {
  sessionStorage.setItem(createScrollKey(key), String(window.scrollY));
}

export function restoreScrollPosition(key: string): void {
  const savedValue = sessionStorage.getItem(createScrollKey(key));

  if (!savedValue) {
    return;
  }

  const scrollY = Number(savedValue);

  if (!Number.isFinite(scrollY)) {
    sessionStorage.removeItem(createScrollKey(key));
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    });
  });
}

export function clearScrollPosition(key: string): void {
  sessionStorage.removeItem(createScrollKey(key));
}
