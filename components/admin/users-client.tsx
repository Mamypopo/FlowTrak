'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Department } from '@/types'

const userSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').optional(),
  name: z.string().min(1, 'กรุณากรอกชื่อ'),
  role: z.enum(['ADMIN', 'STAFF', 'MANAGER']),
  departmentId: z.string().nullable().optional(),
})

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
  })

  useEffect(() => {
    fetchUsers()
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (editingUser) {
      reset({
        username: editingUser.username,
        name: editingUser.name,
        role: editingUser.role,
        departmentId: editingUser.departmentId || '',
      })
    } else {
      reset({
        username: '',
        password: '',
        name: '',
        role: 'STAFF',
        departmentId: '',
      })
    }
  }, [editingUser, reset])

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/user')
    const data = await res.json()
    if (data.users) {
      setUsers(data.users)
    }
  }

  const fetchDepartments = async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }

  const onSubmit = async (data: any) => {
    try {
      const url = editingUser
        ? `/api/admin/user/${editingUser.id}`
        : '/api/admin/user'
      const method = editingUser ? 'PUT' : 'POST'

      // Don't send password if editing and password is empty
      if (editingUser && !data.password) {
        delete data.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: editingUser ? 'อัปเดตผู้ใช้สำเร็จ' : 'สร้างผู้ใช้สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsDialogOpen(false)
        setEditingUser(null)
        reset()
        fetchUsers()
      } else {
        const error = await res.json()
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.error || 'กรุณาลองใหม่อีกครั้ง',
        }))
      }
    } catch (error) {
      await Swal.fire(getSwalConfig({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      }))
    }
  }

  const handleDelete = async (id: string) => {
    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบผู้ใช้นี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/admin/user/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบผู้ใช้สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        fetchUsers()
      } else {
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'กรุณาลองใหม่อีกครั้ง',
        }))
      }
    } catch (error) {
      await Swal.fire(getSwalConfig({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      }))
    }
  }

  const roleLabels = {
    ADMIN: 'ผู้ดูแลระบบ',
    STAFF: 'พนักงาน',
    MANAGER: 'ผู้จัดการ',
  }

  return (
    <div className="flex-1 container mx-auto p-6">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">จัดการผู้ใช้</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingUser(null)}>
                <Plus className="h-4 w-4 mr-2" />
                สร้างผู้ใช้
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'แก้ไขผู้ใช้' : 'สร้างผู้ใช้'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="username">ชื่อผู้ใช้</Label>
                  <Input
                    id="username"
                    {...register('username')}
                    placeholder="กรอกชื่อผู้ใช้"
                    disabled={!!editingUser}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive mt-1">{String(errors.username?.message || '')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">
                    รหัสผ่าน {editingUser && '(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password')}
                    placeholder="กรอกรหัสผ่าน"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{String(errors.password?.message || '')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name">ชื่อ</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="กรอกชื่อ"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{String(errors.name?.message || '')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">บทบาท</Label>
                  <select
                    id="role"
                    {...register('role')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="STAFF">พนักงาน</option>
                    <option value="MANAGER">ผู้จัดการ</option>
                    <option value="ADMIN">ผู้ดูแลระบบ</option>
                  </select>
                  {errors.role && (
                    <p className="text-sm text-destructive mt-1">{String(errors.role?.message || '')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="departmentId">แผนก</Label>
                  <select
                    id="departmentId"
                    {...register('departmentId')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">ไม่มีแผนก</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button type="submit" className="w-full">
                  {editingUser ? 'อัปเดต' : 'สร้าง'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการผู้ใช้</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge>{roleLabels[user.role]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.username}</p>
                    {user.department && (
                      <p className="text-sm text-muted-foreground">{user.department.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingUser(user)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

