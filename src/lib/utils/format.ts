import { format } from "date-fns";

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "yyyy/MM/dd HH:mm");
}
