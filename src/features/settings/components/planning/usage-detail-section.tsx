interface UsageDetailSectionProps {
  title: React.ReactNode;
  progress?: React.ReactNode;
  alert?: React.ReactNode;
}
export const UsageDetailSection = ({
  title,
  progress,
  alert,
}: UsageDetailSectionProps) => {
  return (
    <div className="flex flex-col gap-2">
      {title}
      {progress}
      {alert}
    </div>
  );
};