import { NextRequest } from "next/server";

export const createRequest = (
  url: string,
  method?: string,
  body?: any
): NextRequest =>
  new NextRequest(url, {
    headers: new Headers(),
    method: method || "GET",
    body: JSON.stringify(body),
  });
