'use client'
import { AssetForm } from '@/features/assets/components/forms/asset-form'
import { useShowAsset } from '@/features/assets/hooks/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { assetFormSchema, AssetType } from '@/shared/schemas/assets'
import { z } from 'zod'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useParams } from 'next/navigation'
import { useUpdateAsset } from '@/features/assets/hooks/mutations'

export const AssetDetail = () => {
  const { asset_id, org_id } = useParams<{
    asset_id: string
    org_id: string
  }>()

  const { data: asset, isLoading } = useShowAsset(org_id, asset_id)

  const { mutate: updateAsset, isPending: isUpdating } = useUpdateAsset(org_id, asset_id)
  const handleUpdate = (values: z.infer<typeof assetFormSchema>) => {
    updateAsset(values)
  }

  return (
    <div className="space-y-4">
      <Card className="">
        <CardHeader>
          <CardTitle>Asset Detail</CardTitle>
        </CardHeader>
        <CardContent className="w-full">
          {isLoading ? (
            <Skeleton className="w-full h-[256px]" />
          ) : (
            <div className="flex gap-2 w-full">
              <div className="flex-1">
                <AssetForm initialData={asset} isLoading={isUpdating} onSubmit={handleUpdate} />
              </div>
              {asset &&
                [AssetType.DIGITAL_SIGNAGE, AssetType.NFC].includes(asset?.type as AssetType)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
