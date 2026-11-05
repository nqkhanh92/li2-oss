import { UnsubscribePreferences } from '@/features/settings/components/unsubscribe-preferences'

export default function UnsubscribePage({ params }: { params: { token: string } }) {
  return <UnsubscribePreferences token={params.token} />
}
