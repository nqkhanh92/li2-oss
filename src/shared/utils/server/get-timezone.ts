import { headers } from "next/headers";

export const getTimeZone = () => {
  const headersList = headers();
  const timeZone = headersList.get("x-timezone");
  return timeZone ?? undefined;
};
