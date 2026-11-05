import { useQuery } from "@tanstack/react-query";
import { axiosMapboxApiInstance } from "@/shared/lib/axios";
type SearchLocationResponse = {
  features: {
    type: string;
    geometry: {
      coordinates: [number, number];
      type: string;
    };
    properties: {
      name: string;
      mapbox_id: string;
      feature_type: string;
      address: string;
      full_address: string;
      place_formatted: string;
      context: {
        country: {
          name: string;
          country_code: string;
          country_code_alpha_3: string;
        };
        postcode: {
          id: string;
          name: string;
        };
        place: {
          id: string;
          name: string;
        };
        address: {
          name: string;
          address_number: string;
          street_name: string;
        };
        street: {
          name: string;
        };
      };
      coordinates: {
        latitude: number;
        longitude: number;
        routable_points: {
          name: string;
          latitude: number;
          longitude: number;
        }[];
      };
      language: string;
      maki: string;
      poi_category: string[];
      poi_category_ids: string[];
      external_ids: {
        dataplor: string;
      };
      metadata: {
        phone: string;
      };
    };
  }[];
};

export const useSearchLocation = (search: string) => {
  return useQuery({
    queryKey: ["mapbox-location-search", search],
    queryFn: async () => {
      const { data } = await axiosMapboxApiInstance.get<SearchLocationResponse>(
        `/search/searchbox/v1/forward?q=${search}`
      );
      return data;
    },
    enabled: !!search,
  });
};
