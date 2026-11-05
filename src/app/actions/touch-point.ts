"use server";
import axios, { AxiosError } from "axios";
import https from "https";

export async function verifyUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      httpsAgent: new https.Agent({ keepAlive: true }),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
      validateStatus: () => true, // accept all status codes
    });

    return true; // successful request (any status code)
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.log({
        error: "Invalid URL for tp create",
        url,
        code: error?.message,
      });
      return false;
    }
    console.log({ error });
    return true; // other errors (DNS, 404, SSL, etc.) are still considered valid
  }
}
