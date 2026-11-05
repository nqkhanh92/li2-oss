import { initServerI18n } from "@/shared/lib/i18n/i18n-server";

export async function generateMetadata() {
  const i18n = await initServerI18n("common");
  return {
    title: i18n.t("module.utmTemplates"),
  };
}
export default function TagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
