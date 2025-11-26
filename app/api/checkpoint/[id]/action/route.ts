import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { emitToWork } from '@/lib/socket'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum(['start', 'complete', 'return', 'problem']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = actionSchema.parse(body)

    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: params.id },
      include: {
        work: true,
        ownerDept: true,
      },
    })

    if (!checkpoint) {
      return NextResponse.json(
        { error: 'ไม่พบ checkpoint' },
        { status: 404 }
      )
    }

    let newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'RETURNED' | 'PROBLEM'
    let updateData: any = {}

    switch (validated.action) {
      case 'start':
        newStatus = 'PROCESSING'
        updateData.startedAt = new Date()
        break
      case 'complete':
        newStatus = 'COMPLETED'
        updateData.endedAt = new Date()
        if (!checkpoint.startedAt) {
          updateData.startedAt = new Date()
        }
        break
      case 'return':
        newStatus = 'RETURNED'
        break
      case 'problem':
        newStatus = 'PROBLEM'
        break
    }

    const updated = await prisma.checkpoint.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        ...updateData,
      },
      include: {
        work: true,
        ownerDept: true,
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: `CHECKPOINT_${validated.action.toUpperCase()}`,
        details: `${checkpoint.work.title} - ${checkpoint.name}: ${validated.action}`,
      },
    })

    // Emit real-time event
    emitToWork(checkpoint.workId, 'checkpoint:updated', updated)
    emitToWork(checkpoint.workId, 'activity:new', {
      id: `temp-${Date.now()}`,
      userId: session.id,
      user: {
        id: session.id,
        name: session.name || 'User',
        username: session.username || '',
      },
      action: `CHECKPOINT_${validated.action.toUpperCase()}`,
      details: `${checkpoint.work.title} - ${checkpoint.name}: ${validated.action}`,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ checkpoint: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Checkpoint action error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

