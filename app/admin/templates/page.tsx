import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { TemplatesClient } from '@/components/admin/templates-client'

export default async function TemplatesPage() {
  const session = await getSession()
  
  if (!session || session.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <TemplatesClient />
}

