import { queryClient } from "@/shared/lib/react-query";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { t } from "i18next";
import { toast } from "sonner";

export const useEnableMfa = () => {
  return useMutation({
    mutationFn: async ({
      recoveryCodes,
      secret,
    }: {
      recoveryCodes: string[];
      secret: string;
    }) => {
      const response = await axios.post("/api/auth/mfa/enable", {
        recoveryCodes,
        secret,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa"] });
      toast.success(t('common:messages.success.enable_field', { field: "MFA" }));
    },
  });
};

export const useVerifyMfa = () => {
  return useMutation({
    mutationFn: async ({
      passcode,
      secret,
    }: {
      passcode: string;
      secret: string;
    }) => {
      const response = await axios.post("/api/auth/mfa/verify", {
        passcode,
        secret,
      });
      return response.data;
    },
  });
};

export type InitMfaType = {
  enabled: boolean;
  isPreferred: boolean;
  mfaType: string;
  secret: string;
  url: string;
  recoveryCodes: string[];
};

export const useInitiateMfa = () => {
  return useMutation<InitMfaType>({
    mutationFn: async () => {
      const { data } = await axios.post("/api/auth/mfa/init");
      return data;
    },
  });
};

export const useDisableMfa = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await axios.delete("/api/auth/mfa/enable");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa"] });
      toast.success(t('common:messages.success.disabled_field', { field: "MFA" }));
    },
  });
};
