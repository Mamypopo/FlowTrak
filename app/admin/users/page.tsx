import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { UsersClient } from '@/components/admin/users-client'

export default async function UsersPage() {
  const session = await getSession()
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <UsersClient />
}

