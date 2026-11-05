import { cn } from '@/shared/lib/cn'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useParams } from 'next/navigation'
import { LockableSection } from '@/shared/components/customize/lockable-section'
import { ToolConfig, TOOL_CONFIGS } from '@/shared/types/tool-config'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'

export const DashboardSetupCard = () => {
  const { org_id }: { org_id: string } = useParams()
  const router = useRouter()
  const { t, i18n } = useTranslation('dashboard')
  const tools: ToolConfig[] = useMemo(
    () =>
      TOOL_CONFIGS.map((tool) => {
        const baseButton = t('common:buttons.create', { field: tool.button })
        const specialViButton = tool.special && i18n.language === 'vi' ? 'Rút gọn Link' : baseButton
        return {
          ...tool,
          href: tool.href.replace('${org_id}', org_id),
          button: specialViButton,
        }
      }),
    [org_id, i18n.language]
  )

  return (
    <div className="flex flex-col gap-2 self-stretch items-start">
      <div
        className={cn(
          'flex lg:grid lg:grid-cols-4 items-start gap-6 self-stretch overflow-x-auto rounded-lg'
        )}
      >
        {tools.map((tool) => (
          <LockableSection
            locked={tool.isComming}
            variant="blur"
            lockBy="coming_soon"
            position="center"
            className="w-auto rounded-2xl"
            key={tool.id}
          >
            <Card className="relative flex h-full w-full flex-col items-center gap-3 self-stretch rounded-2xl">
              <CardContent
                className={cn(
                  'flex h-full w-full flex-col items-center justify-between gap-3 p-4 self-stretch',
                  tool.isComming && 'blur-[1px]'
                )}
              >
                <div
                  className={cn(
                    'w-full h-full bg-contain bg-no-repeat bg-center object-contain min-w-[180px] min-h-[136px] aspect-180/136'
                  )}
                  style={{
                    backgroundImage: `url(${tool.icon})`,
                  }}
                ></div>
                <Button
                  variant="secondary"
                  className="rounded-[8px] font-medium h-auto text-sm"
                  disabled={tool.isComming}
                  onClick={() => {
                    router.push(tool.href)
                  }}
                >
                  {tool.button}
                </Button>
              </CardContent>
            </Card>
          </LockableSection>
        ))}
      </div>
    </div>
  )
}
