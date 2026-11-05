import { QrBodyPatternCustomize } from "./qr-body-pattern-customize";

export const QrPatternCustomize = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <QrBodyPatternCustomize pattern="body" />
      <QrBodyPatternCustomize pattern="mix_eye_border_dot" />
    </div>
  );
};
