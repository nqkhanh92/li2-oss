import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type MfaType = {
  multiFactorAuths: any[];
  name: string;
};
export const useGetMfa = () => {
  return useQuery<MfaType>({
    queryKey: ["mfa"],
    queryFn: async () => {
      const {data} = await axios.get("/api/auth/mfa/enable");
      return data;
    },
  });
};
