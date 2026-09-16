import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentMonthString,
  getLocalMonthUtcRange,
  nowIsoString,
  todayDateString,
} from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("date utilities", () => {
  it("現在日時をISO形式で返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T06:30:45.123Z"));

    expect(nowIsoString()).toBe("2026-09-16T06:30:45.123Z");
  });

  it("ローカル日付をYYYY-MM-DD形式で返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 15, 30, 0));

    expect(todayDateString()).toBe("2026-09-16");
  });

  it("ローカル年月をYYYY-MM形式で返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 16, 15, 30, 0));

    expect(currentMonthString()).toBe("2026-09");
  });

  it("ローカル月の開始と終了をUTCのISO形式へ変換する", () => {
    const result = getLocalMonthUtcRange("2026-09");

    expect(result).toEqual({
      startIso: new Date(2026, 8, 1, 0, 0, 0, 0).toISOString(),
      endIso: new Date(2026, 9, 1, 0, 0, 0, 0).toISOString(),
    });
  });

  it("YYYY-MM形式でない対象月を拒否する", () => {
    expect(() => getLocalMonthUtcRange("2026/09")).toThrow(
      "対象月はYYYY-MM形式で指定してください。",
    );
  });

  it("存在しない月を拒否する", () => {
    expect(() => getLocalMonthUtcRange("2026-00")).toThrow(
      "対象月が正しくありません。",
    );

    expect(() => getLocalMonthUtcRange("2026-13")).toThrow(
      "対象月が正しくありません。",
    );
  });
});
