import { useQuery } from "@tanstack/react-query";
import { axiosApiInstance } from "@/shared/lib/axios";
import {
  EntranceDropdown,
  JourneyDropdown,
} from "@/infrastructure/external/integrations/parcelvoy.service";

export const useGetParcelvoyJourneys = (
  org_id: string,
  integrationId: string | undefined
) => {
  return useQuery<JourneyDropdown[]>({
    queryKey: [
      "organizations",
      org_id,
      "integrations",
      integrationId,
      "parcelvoy-journeys",
    ],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<JourneyDropdown[]>(
        `/organizations/${org_id}/integrations/${integrationId}/parcelvoy/journeys`
      );
      return data;
    },
    enabled: !!integrationId,
  });
};

export const useGetParcelvoyEntrances = (
  org_id: string,
  integrationId: string | undefined,
  journeyId: string | undefined
) => {
  return useQuery<EntranceDropdown[]>({
    queryKey: [
      "organizations",
      org_id,
      "integrations",
      integrationId,
      "parcelvoy-entrances",
      journeyId,
    ],
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<EntranceDropdown[]>(
        `/organizations/${org_id}/integrations/${integrationId}/parcelvoy/entrances?journey_id=${journeyId}`
      );
      return data;
    },
    enabled: !!integrationId && !!journeyId,
  });
};

