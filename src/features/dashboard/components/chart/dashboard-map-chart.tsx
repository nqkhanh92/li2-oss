import { MapChart } from '@/shared/components/customize/map-chart'
import { SingleCommandSelect } from '@/shared/components/customize/single-command-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

export const DashboardMapChart = ({
  cityItems,
  countryItems,
}: {
  cityItems: { label: string; value: number }[]
  countryItems: { label: string; value: number }[]
}) => {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="country">Country</TabsTrigger>
        <TabsTrigger value="city">City</TabsTrigger>
      </TabsList>
      <TabsContent value="country">
        {/* <MapChart
          className="w-full! max-h-[400px] border"
          cityItems={cityItems}
          countryItems={countryItems}
        /> */}
      </TabsContent>
      <TabsContent value="city">
        <SingleCommandSelect
          options={cityItems.map((item) => ({
            label: item.label,
            value: item.value.toString(),
          }))}
          value={cityItems[0].value.toString()}
          onChange={(value) => {}}
        />
      </TabsContent>
    </Tabs>
  )
}
