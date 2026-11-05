export const bufferFromUrl = async (url: string): Promise<Buffer | null> => {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
};
