import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DepartmentsClient } from '@/components/admin/departments-client'
import { AppLayout } from '@/components/layout/app-layout'

export default async function DepartmentsPage() {
  const session = await getSession()
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <AppLayout>
      <DepartmentsClient />
    </AppLayout>
  )
}

