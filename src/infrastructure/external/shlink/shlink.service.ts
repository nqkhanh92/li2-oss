import { axiosShlinkApiInstance } from "@/shared/lib/axios";
import { cookies } from "next/headers";

type ParcelvoyAccessTokenResponse = {
  data: {
    token: string;
    expires_at: string;
  };
};

export class ShlinkService {
  private axiosClient = axiosShlinkApiInstance;
  constructor() {
    const access_token = cookies().get("casdoor_access_token")?.value;
    if (!access_token) {
      throw Error("Unauthorized");
    }
    this.axiosClient.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${access_token}`;
    this.axiosClient.defaults.headers.common["X-Api-Key"] =
      process.env.SHLINK_API_KEY;
  }

  async verifyDomain(domainId: string) {
    const { data } = await this.axiosClient.post(`/domains/verify/${domainId}`);
    return data;
  }
  async deleteDomain(domainId: string) {
    const { data } = await this.axiosClient.delete(`/domains/${domainId}`);
    return data;
  }

  async activateNFC(serial_number: string) {
    const { data } = await this.axiosClient.post(
      `/nfcs/active/${serial_number}`
    );
    return data;
  }
  async getParcelvoyAccessToken(email: string, userId: string) {
    const { data } = await this.axiosClient.post<ParcelvoyAccessTokenResponse>(
      "/parcelvoy/generate-access-token",
      {
        user_id: userId,
        email,
      }
    );
    return data;
  }
}
