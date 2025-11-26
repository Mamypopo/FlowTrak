'use client'

import { useState, useEffect } from 'react'
import { WorkOrder } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Search, Building2, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkSidebarProps {
  selectedWorkId?: string
  onSelectWork: (workId: string) => void
}

const priorityColors = {
  LOW: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  HIGH: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  URGENT: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
}

const priorityLabels = {
  LOW: 'ต่ำ',
  MEDIUM: 'ปานกลาง',
  HIGH: 'สูง',
  URGENT: 'ด่วน',
}

const getWorkStatus = (work: WorkOrder) => {
  if (!work.checkpoints || work.checkpoints.length === 0) return 'PENDING'
  const allCompleted = work.checkpoints.every(cp => cp.status === 'COMPLETED')
  const hasProcessing = work.checkpoints.some(cp => cp.status === 'PROCESSING')
  const hasProblem = work.checkpoints.some(cp => cp.status === 'PROBLEM')
  
  if (allCompleted) return 'COMPLETED'
  if (hasProblem) return 'PROBLEM'
  if (hasProcessing) return 'PROCESSING'
  return 'PENDING'
}

const getWorkProgress = (work: WorkOrder) => {
  if (!work.checkpoints || work.checkpoints.length === 0) return 0
  const completed = work.checkpoints.filter(cp => cp.status === 'COMPLETED').length
  return Math.round((completed / work.checkpoints.length) * 100)
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    label: 'รอ' 
  },
  PROCESSING: { 
    icon: TrendingUp, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'กำลัง' 
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'เสร็จ' 
  },
  PROBLEM: { 
    icon: AlertTriangle, 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'ปัญหา' 
  },
}

export function WorkSidebar({ selectedWorkId, onSelectWork }: WorkSidebarProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    fetchWorkOrders()
    fetchDepartments()
  }, [])

  useEffect(() => {
    filterWorkOrders()
  }, [searchTerm, departmentFilter, statusFilter, priorityFilter, workOrders])

  const fetchWorkOrders = async () => {
    const params = new URLSearchParams()
    if (departmentFilter !== 'all') params.append('departmentId', departmentFilter)
    if (statusFilter !== 'all') params.append('status', statusFilter)
    if (priorityFilter !== 'all') params.append('priority', priorityFilter)

    const res = await fetch(`/api/work?${params}`)
    const data = await res.json()
    if (data.workOrders) {
      setWorkOrders(data.workOrders)
    }
  }

  const fetchDepartments = async () => {
    const res = await fetch('/api/department')
    const data = await res.json()
    if (data.departments) {
      setDepartments(data.departments)
    }
  }

  const filterWorkOrders = () => {
    let filtered = [...workOrders]

    if (searchTerm) {
      filtered = filtered.filter(
        (work) =>
          work.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          work.company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredOrders(filtered)
  }

  return (
    <div className="h-full flex flex-col bg-background py-4 pl-4 pr-3">
      {/* Compact Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          งานทั้งหมด
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      {/* Compact Filters */}
      <div className="space-y-1.5 mb-3">
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="แผนก" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
            <SelectItem value="PROCESSING">กำลังดำเนินการ</SelectItem>
            <SelectItem value="COMPLETED">เสร็จสิ้น</SelectItem>
            <SelectItem value="PROBLEM">มีปัญหา</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="ความสำคัญ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="LOW">ต่ำ</SelectItem>
            <SelectItem value="MEDIUM">ปานกลาง</SelectItem>
            <SelectItem value="HIGH">สูง</SelectItem>
            <SelectItem value="URGENT">ด่วน</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Work List - Compact */}
      <div className="flex-1 overflow-y-auto -mr-1 pr-1">
        {filteredOrders.length === 0 ? (
          <div className="p-3 text-center text-xs text-muted-foreground">
            ไม่พบงาน
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredOrders.map((work) => {
              const status = getWorkStatus(work)
              const progress = getWorkProgress(work)
              const statusInfo = statusConfig[status as keyof typeof statusConfig]
              const StatusIcon = statusInfo.icon
              const isSelected = selectedWorkId === work.id

              return (
                <Card
                  key={work.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 border-2 rounded-lg",
                    isSelected 
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" 
                      : "border-border hover:border-primary/50 hover:bg-accent/50 shadow-sm"
                  )}
                  onClick={() => onSelectWork(work.id)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {/* Header - Compact */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn(
                          "font-semibold text-xs line-clamp-2 flex-1 leading-tight transition-colors",
                          isSelected && "text-primary"
                        )}>
                          {work.title}
                        </h4>
                        <Badge className={cn("shrink-0 text-[10px] px-1.5 py-0", priorityColors[work.priority])}>
                          {priorityLabels[work.priority]}
                        </Badge>
                      </div>

                      {/* Company - Compact */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1 truncate">{work.company}</span>
                      </div>

                      {/* Status & Progress - Compact */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-4 w-4 rounded-full flex items-center justify-center shrink-0", statusInfo.bgColor)}>
                              <StatusIcon className={cn("h-2.5 w-2.5", statusInfo.color)} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{statusInfo.label}</span>
                          </div>
                          <span className="text-[10px] font-medium">{progress}%</span>
                        </div>
                        
                        {/* Progress Bar - Compact */}
                        {work.checkpoints && work.checkpoints.length > 0 && (
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-300",
                                status === 'COMPLETED' ? "bg-green-500" : 
                                status === 'PROCESSING' ? "bg-blue-500" :
                                status === 'PROBLEM' ? "bg-red-500" : "bg-muted-foreground"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Footer - Compact */}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t">
                        <span>{work.checkpoints?.length || 0} จุด</span>
                        <span>{format(new Date(work.createdAt), 'dd MMM', { locale: th })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
