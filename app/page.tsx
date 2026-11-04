import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

// Đọc cookie nên không thể render tĩnh.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()
  redirect(user ? '/links' : '/login')
}
