import { useEffect, useState } from "react";

export function useCooldown(cooldownUntil: Date | null): {
  remaining: number;
  isCooldown: boolean;
} {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const updateRemaining = () => {
      if (!cooldownUntil) {
        setRemaining(0);
        return;
      }

      const now = new Date();
      const diff = Math.max(
        0,
        Math.floor((cooldownUntil.getTime() - now.getTime()) / 1000)
      );
      setRemaining(diff);

      if (diff === 0 && interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    updateRemaining();
    interval = setInterval(updateRemaining, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownUntil]);

  return {
    remaining,
    isCooldown: remaining > 0,
  };
}
