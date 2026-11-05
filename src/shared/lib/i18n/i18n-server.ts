import i18n from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
import { cookies } from "next/headers";
import { defaultNS, fallbackLng, supportedLngs } from "./config";

const i18nInstance = i18n.use(
  resourcesToBackend(
    // use .. instead of @/, current turpo have a bug with alias when using dynamic import
    (lng: string, ns: string) => import(`../../../../public/lang/${lng}/${ns}.json`)
  )
);

export async function initServerI18n(ns?: string | string[]) {
  const cookieStore = cookies();
  const localeFromCookie = cookieStore.get("i18next")?.value;
  const lng = supportedLngs.includes(localeFromCookie || "")
    ? localeFromCookie
    : fallbackLng;
  const namespacesToLoad = ns ?? defaultNS;

  await i18nInstance.init({
    lng,
    fallbackLng,
    supportedLngs,
    load: "currentOnly",
    ns: namespacesToLoad,
    defaultNS,
    debug: false,
    initImmediate: false,
    detection: undefined,
    interpolation: {
      escapeValue: false,
    },
    preload: supportedLngs,
    react: {
      useSuspense: false,
    },
  });

  return {
    i18nInstance,
    t: i18nInstance.getFixedT(
      lng ?? fallbackLng,
      Array.isArray(namespacesToLoad) ? namespacesToLoad : [namespacesToLoad]
    ),
  };
}
