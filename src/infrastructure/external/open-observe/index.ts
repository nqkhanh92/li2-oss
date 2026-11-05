import { OpenObserveClient, OpenObserveConfig } from "./client";

const config: OpenObserveConfig = {
  url: process.env.OPEN_OBSERVE_URL!,
  organization: process.env.OPEN_OBSERVE_ORGANIZATION!,
  username: process.env.OPEN_OBSERVE_USERNAME!,
  password: process.env.OPEN_OBSERVE_PASSWORD!,
};

export const openObserveClient =
  globalThis._openObserveClient ?? new OpenObserveClient(config);

if (process.env.NODE_ENV !== "production")
  globalThis._openObserveClient = openObserveClient;
