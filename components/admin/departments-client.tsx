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
import { Department } from '@/types'

const departmentSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อแผนก'),
})

export function DepartmentsClient() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(departmentSchema),
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (editingDepartment) {
      reset({
        name: editingDepartment.name,
      })
    } else {
      reset({
        name: '',
      })
    }
  }, [editingDepartment, reset])

  const fetchDepartments = async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }

  const onSubmit = async (data: { name: string }) => {
    try {
      const url = editingDepartment
        ? `/api/department/${editingDepartment.id}`
        : '/api/department'
      const method = editingDepartment ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: editingDepartment ? 'อัปเดตแผนกสำเร็จ' : 'สร้างแผนกสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        setIsDialogOpen(false)
        setEditingDepartment(null)
        reset()
        fetchDepartments()
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
      text: 'คุณต้องการลบแผนกนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/department/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'ลบแผนกสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))
        fetchDepartments()
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

  return (
    <div className="flex-1 container mx-auto p-6">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">จัดการแผนก</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingDepartment(null)}>
                <Plus className="h-4 w-4 mr-2" />
                สร้างแผนก
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? 'แก้ไขแผนก' : 'สร้างแผนก'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อแผนก</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="กรอกชื่อแผนก"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{String(errors.name?.message || '')}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  {editingDepartment ? 'อัปเดต' : 'สร้าง'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>รายการแผนก</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold">{department.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingDepartment(department)
                        setIsDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(department.id)}
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

