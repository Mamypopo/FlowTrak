import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF', 'MANAGER']),
  departmentId: z.string().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = createUserSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(validated.password)

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        passwordHash,
        name: validated.name,
        role: validated.role,
        departmentId: validated.departmentId || null,
      },
      include: {
        department: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ข้อมูลไม่ถูกต้อง', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    )
  }
}

