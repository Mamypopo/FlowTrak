import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return <DashboardClient />
}

