'use client'

import { Button } from '@/shared/components/ui/button'
import { useCheckMomoTransaction } from '@/ee/features/payment/hooks/mutation'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function CheckTransactionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<boolean>(false)

  const orderId = params.get('orderId') as string
  const requestId = params.get('requestId') as string

  const { mutate: checkMomoTransaction } = useCheckMomoTransaction()

  const handleCheckTransaction = () => {
    checkMomoTransaction(
      {
        requestId: requestId,
        orderId: orderId,
      },
      {
        onSuccess: () => {
          router.replace('/org')
        },
        onError: () => {
          setError(true)
        },
      }
    )
  }

  useEffect(() => {
    handleCheckTransaction()
  }, [orderId, requestId])

  return (
    <div>
      <h1>Checking transaction...</h1>
      {error && (
        <>
          <p>Something went wrong</p>

          <Button onClick={() => router.push('/org')}>Back</Button>
        </>
      )}
    </div>
  )
}
