'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/layout/nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, GripVertical } from 'lucide-react'
import Swal from 'sweetalert2'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Template, TemplateCheckpoint, Department } from '@/types'

const templateSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อเทมเพลต'),
})

const checkpointSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ checkpoint'),
  ownerDeptId: z.string().min(1, 'กรุณาเลือกแผนก'),
})

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editingCheckpoint, setEditingCheckpoint] = useState<TemplateCheckpoint | null>(null)

  const {
    register: registerTemplate,
    handleSubmit: handleSubmitTemplate,
    reset: resetTemplate,
    formState: { errors: templateErrors },
  } = useForm({
    resolver: zodResolver(templateSchema),
  })

  const {
    register: registerCheckpoint,
    handleSubmit: handleSubmitCheckpoint,
    reset: resetCheckpoint,
    formState: { errors: checkpointErrors },
  } = useForm({
    resolver: zodResolver(checkpointSchema),
  })

  useEffect(() => {
    fetchTemplates()
    fetchDepartments()
  }, [])

  const fetchTemplates = async () => {
    const res = await fetch('/api/template')
    const data = await res.json()
    if (data.templates) {
      setTemplates(data.templates)
    }
  }

  const fetchDepartments = async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }

  const handleCreateTemplate = async (data: { name: string }) => {
    try {
      const res = await fetch('/api/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'สร้างเทมเพลตสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        })
        setIsTemplateDialogOpen(false)
        resetTemplate()
        fetchTemplates()
      } else {
        const error = await res.json()
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.error || 'กรุณาลองใหม่อีกครั้ง',
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบเทมเพลตนี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/template/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'ลบเทมเพลตสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        })
        fetchTemplates()
        if (selectedTemplate?.id === id) {
          setSelectedTemplate(null)
        }
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'กรุณาลองใหม่อีกครั้ง',
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const handleCreateCheckpoint = async (data: { name: string; ownerDeptId: string }) => {
    if (!selectedTemplate) return

    try {
      const order = (selectedTemplate.checkpoints?.length || 0) + 1

      const res = await fetch('/api/template/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          templateId: selectedTemplate.id,
          order,
        }),
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'สร้าง checkpoint สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        })
        setIsCheckpointDialogOpen(false)
        resetCheckpoint()
        fetchTemplates()
        const updated = templates.find((t) => t.id === selectedTemplate.id)
        if (updated) setSelectedTemplate(updated)
      } else {
        const error = await res.json()
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.error || 'กรุณาลองใหม่อีกครั้ง',
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  const handleDeleteCheckpoint = async (id: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณต้องการลบ checkpoint นี้หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/template/checkpoint/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'ลบ checkpoint สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        })
        fetchTemplates()
        const updated = templates.find((t) => t.id === selectedTemplate?.id)
        if (updated) setSelectedTemplate(updated)
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'กรุณาลองใหม่อีกครั้ง',
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'กรุณาลองใหม่อีกครั้ง',
      })
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      
      <div className="container mx-auto p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">จัดการ Templates</h1>
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                สร้าง Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>สร้าง Template</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitTemplate(handleCreateTemplate)} className="space-y-4">
                <div>
                  <Label htmlFor="name">ชื่อ Template</Label>
                  <Input
                    id="name"
                    {...registerTemplate('name')}
                    placeholder="กรอกชื่อ template"
                  />
                  {templateErrors.name && (
                    <p className="text-sm text-destructive mt-1">{templateErrors.name.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">สร้าง</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates List */}
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-accent border-primary'
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.checkpoints?.length || 0} checkpoints
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTemplate(template.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Checkpoints List */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>
                {selectedTemplate ? `Checkpoints: ${selectedTemplate.name}` : 'Checkpoints'}
              </CardTitle>
              {selectedTemplate && (
                <Dialog open={isCheckpointDialogOpen} onOpenChange={setIsCheckpointDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่ม
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>สร้าง Checkpoint</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleSubmitCheckpoint(handleCreateCheckpoint)}
                      className="space-y-4"
                    >
                      <div>
                        <Label htmlFor="checkpoint-name">ชื่อ Checkpoint</Label>
                        <Input
                          id="checkpoint-name"
                          {...registerCheckpoint('name')}
                          placeholder="กรอกชื่อ checkpoint"
                        />
                        {checkpointErrors.name && (
                          <p className="text-sm text-destructive mt-1">
                            {checkpointErrors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="ownerDeptId">แผนก</Label>
                        <select
                          id="ownerDeptId"
                          {...registerCheckpoint('ownerDeptId')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">เลือกแผนก</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        {checkpointErrors.ownerDeptId && (
                          <p className="text-sm text-destructive mt-1">
                            {checkpointErrors.ownerDeptId.message}
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="w-full">สร้าง</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-2">
                  {selectedTemplate.checkpoints && selectedTemplate.checkpoints.length > 0 ? (
                    selectedTemplate.checkpoints.map((checkpoint) => (
                      <div
                        key={checkpoint.id}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-sm">{checkpoint.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {checkpoint.ownerDept.name}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      ยังไม่มี checkpoint
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  เลือก template เพื่อดู checkpoints
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

