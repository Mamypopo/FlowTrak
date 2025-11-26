import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DepartmentsClient } from '@/components/admin/departments-client'

export default async function DepartmentsPage() {
  const session = await getSession()
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <DepartmentsClient />
}

