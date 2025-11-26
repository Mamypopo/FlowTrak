import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createCommentSchema = z.object({
  checkpointId: z.string().optional(),
  workId: z.string().optional(),
  message: z.string().optional(),
  fileUrl: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const checkpointId = searchParams.get('checkpointId')
    const workId = searchParams.get('workId')

    if (!checkpointId && !workId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ checkpointId หรือ workId' },
        { status: 400 }
      )
    }

    const where: any = {}
    if (checkpointId) {
      where.checkpointId = checkpointId
    }
    if (workId) {
      where.workId = workId
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const checkpointId = formData.get('checkpointId') as string | null
    const workId = formData.get('workId') as string | null
    const message = formData.get('message') as string | null
    const file = formData.get('file') as File | null

    if (!checkpointId && !workId) {
      return NextResponse.json(
        { error: 'กรุณาระบุ checkpointId หรือ workId' },
        { status: 400 }
      )
    }

    if (!message?.trim() && !file) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อความหรืออัปโหลดไฟล์' },
        { status: 400 }
      )
    }

    let fileUrl: string | undefined

    // Handle file upload (simplified - in production, use proper file storage)
    if (file) {
      // For now, we'll just store the filename
      // In production, upload to S3, Cloudinary, etc.
      fileUrl = `/uploads/${Date.now()}-${file.name}`
    }

    const comment = await prisma.comment.create({
      data: {
        checkpointId: checkpointId || undefined,
        workId: workId || undefined,
        userId: session.id,
        message: message?.trim() || undefined,
        fileUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        checkpoint: {
          select: {
            id: true,
            name: true,
            work: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        work: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Create activity log
    const logDetails = checkpointId 
      ? `คอมเมนต์ใน: ${comment.work?.title || ''} - ${comment.checkpoint?.name || ''}`
      : `คอมเมนต์ในงาน: ${comment.work?.title || ''}`
    
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'ADD_COMMENT',
        details: logDetails,
      },
    })

    return NextResponse.json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

