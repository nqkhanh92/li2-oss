import Link from "next/link";

type AlertUsageMaximumProps = {
  text: string;
  linkCta: string;
};
export const AlertUsageMaximum = ({ text, linkCta }: AlertUsageMaximumProps) => {
  return (
    <span className="flex lg:flex-row flex-col lg:items-center items-start lg:gap-1 text-destructive text-sm">
      {text} <Link href="https://li2.ai/pricing" className="text-slate-600 font-normal italic lg:px-0 px-1 hover:text-primary">{linkCta}</Link>
    </span>
  );
};
