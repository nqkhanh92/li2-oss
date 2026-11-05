import { initServerI18n } from "@/shared/lib/i18n/i18n-server";

export async function generateMetadata() {
  const i18n = await initServerI18n("common");
  return {
    title: i18n.t("module.integration"),
  };
}

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
