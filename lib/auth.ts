import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'STAFF' | 'MANAGER'
  departmentId: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set('session', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  
  if (!session?.value) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.value },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      departmentId: true,
    },
  })

  return user as SessionUser | null
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

