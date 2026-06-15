export function nowIsoString(): string {
  return new Date().toISOString();
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthString(): string {
  return new Date().toISOString().slice(0, 7);
}
