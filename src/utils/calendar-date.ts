export function toCalendarPickerDate(
  value: Date,
  utc: boolean,
): Date {
  const result = new Date(0);

  if (utc) {
    result.setUTCFullYear(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
    );
    result.setUTCHours(12, 0, 0, 0);
  } else {
    result.setFullYear(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
    );
    result.setHours(12, 0, 0, 0);
  }

  return result;
}

export function fromCalendarPickerDate(
  value: Date,
  utc: boolean,
): Date {
  const result = new Date(0);

  result.setFullYear(
    utc ? value.getUTCFullYear() : value.getFullYear(),
    utc ? value.getUTCMonth() : value.getMonth(),
    utc ? value.getUTCDate() : value.getDate(),
  );
  result.setHours(12, 0, 0, 0);

  return result;
}

export function formatCalendarDate(
  value: Date,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toCalendarPickerDate(value, true));
}