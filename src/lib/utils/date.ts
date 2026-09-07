export function nowIsoString(): string {
  return new Date().toISOString();
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayDateString(): string {
  const now = new Date();

  return [
    now.getFullYear(),
    padTwoDigits(now.getMonth() + 1),
    padTwoDigits(now.getDate()),
  ].join("-");
}

export function currentMonthString(): string {
  const now = new Date();

  return `${now.getFullYear()}-${padTwoDigits(now.getMonth() + 1)}`;
}

export function getLocalMonthUtcRange(targetMonth: string): {
  startIso: string;
  endIso: string;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(targetMonth);

  if (!match) {
    throw new Error("対象月はYYYY-MM形式で指定してください。");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new Error("対象月が正しくありません。");
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
