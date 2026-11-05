export const formatHour = (h: number) =>
  h === 0
    ? "12 AM"
    : h <= 12
    ? `${h} ${h === 12 ? "PM" : "AM"}`
    : `${h - 12} PM`;

export const formatTimeRange = (hours: number[]) => {
  if (hours.length === 0) return null;
  if (hours.length === 1) return formatHour(hours[0]);

  const ranges: [number, number][] = [];
  let start = hours[0],
    end = hours[0];

  for (let i = 1; i < hours.length; i++) {
    if (hours[i] === end + 1) {
      end = hours[i];
    } else {
      ranges.push([start, end]);
      start = end = hours[i];
    }
  }
  ranges.push([start, end]);

  return ranges
    .map(([s, e]) =>
      s === e ? formatHour(s) : `${formatHour(s)}-${formatHour(e)}`
    )
    .join(", ");
};
