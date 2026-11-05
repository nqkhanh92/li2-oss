export const isValidImageUrl = async (
  url: string | undefined
): Promise<[boolean, boolean]> => {
  let [isValidImage, isError] = [false, false];
  if (!url) return [false, false];

  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 3000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        mode: "cors",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const contentType = response.headers.get("content-type");
      isValidImage = contentType?.startsWith("image/") ?? false;
    } catch (error) {
      clearTimeout(timeout);
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === MAX_RETRIES) return [false, true];
    }
  }

  return [isValidImage, isError];
};
