import { logger } from "@/infrastructure/logging/logger";
import axios from "axios";
type GetMetaTagsFromUrlResponse = {
  data: {
    title: string;
    description: string;
    image: string;
  };
  [key: string]: any;
};

const log = logger.child({
  service: "utilities",
});
export class Utilities {
  protected axiosInstance = axios.create({
    baseURL: `${process.env.UTILITY_API_URL}`,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.SHLINK_API_KEY,
    },
    timeout: 10000,
  });

  async getMetaTagsFromUrl(
    url: string
  ): Promise<GetMetaTagsFromUrlResponse | null> {
    try {
      const { data } = await this.axiosInstance.get<GetMetaTagsFromUrlResponse>(
        `/meta-tags/get-meta-tags`,
        {
          params: {
            url,
          },
        }
      );
      return data;
    } catch (error) {
      log.info({ message: "Failed to get meta tags for url " + url, error });
      return null;
    }
  }
}
