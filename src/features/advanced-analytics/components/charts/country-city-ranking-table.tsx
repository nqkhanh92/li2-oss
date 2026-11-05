import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { GeographicDistribution } from '@/core/types/analytics/geographic-distribution.type'
import { MapChartRef } from './country-map-chart'

type CountryCityRankingTableProps = {
  data: GeographicDistribution
  geoUrl: Record<string, any>
  mapChartRef: React.RefObject<MapChartRef>
}

export const CountryCityRankingTable = ({
  data,
  geoUrl,
  mapChartRef,
}: CountryCityRankingTableProps) => {
  return (
    <Tabs defaultValue="countries" className="w-full">
      <TabsList variant="outline">
        <TabsTrigger variant="outline" value="countries">
          Country
        </TabsTrigger>
        <TabsTrigger variant="outline" value="cities">
          City
        </TabsTrigger>
      </TabsList>
      <TabsContent value="countries">
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>NO</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Visit</TableHead>
              <TableHead>Visit Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(data.geographic_data.countries) &&
              data.geographic_data.countries.map((country, index) => (
                <TableRow
                  key={country.country}
                  onClick={() => {
                    mapChartRef.current?.zoomToCountry(country.country)
                  }}
                  className="cursor-pointer"
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{country.country || 'Unknown'}</TableCell>
                  <TableCell>{country.total_visits}</TableCell>
                  <TableCell>{country.visit_share_pct}%</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TabsContent>
      <TabsContent value="cities">
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>NO</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Visit</TableHead>
              <TableHead>Visit Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(data.geographic_data.cities) &&
              data.geographic_data.cities.map((city, index) => (
                <TableRow key={city.city}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{city.city || 'Unknown'}</TableCell>
                  <TableCell>{city.total_visits}</TableCell>
                  <TableCell>
                    {(
                      (city.total_visits /
                        (data?.geographic_data?.cities?.reduce(
                          (acc, city) => acc + city.total_visits,
                          0
                        ) || 0)) *
                      100
                    ).toFixed(2)}
                    %
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  )
}
