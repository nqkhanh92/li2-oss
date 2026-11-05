import { useQuery } from "@tanstack/react-query";
import { axiosApiInstance } from "@/shared/lib/axios";
import { UserProfile } from "@/shared/providers/auth-provider";

export const useGetProfile = () => {
  return useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<UserProfile>(
        "/users/profile"
      );
      return data;
    },
  });
};
