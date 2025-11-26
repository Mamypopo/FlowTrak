import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { WorkDetailClient } from '@/components/work/work-detail-client'

export default async function WorkDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  return <WorkDetailClient workId={params.id} />
}

