'use client'

import { WorkOrder, ActivityLog } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { FileText, Clock, User, Activity, Download, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useSocket } from '@/lib/socket-client'
import { cn } from '@/lib/utils'

interface InfoPanelProps {
  workOrder: WorkOrder | null
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

export function InfoPanel({ workOrder }: InfoPanelProps) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const socket = useSocket()

  useEffect(() => {
    if (workOrder) {
      fetchActivityLogs()
    } else {
      setActivityLogs([])
    }
  }, [workOrder])

  useEffect(() => {
    if (socket && workOrder) {
      socket.emit('join:work', workOrder.id)

      socket.on('activity:new', (log: ActivityLog) => {
        setActivityLogs((prev) => [log, ...prev])
      })

      return () => {
        socket.off('activity:new')
        socket.emit('leave:work', workOrder.id)
      }
    }
  }, [socket, workOrder])

  const fetchActivityLogs = async () => {
    if (!workOrder) return

    const res = await fetch(`/api/activity?limit=50`)
    const data = await res.json()
    if (data.logs) {
      // Filter logs related to this work order
      const filtered = data.logs.filter((log: ActivityLog) =>
        log.details?.includes(workOrder.title)
      )
      setActivityLogs(filtered)
    }
  }

  if (!workOrder) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            เลือกงานเพื่อดูรายละเอียด
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          ข้อมูลงาน
        </h3>
        <h2 className="text-base font-bold line-clamp-2 leading-tight">{workOrder.title}</h2>
      </div>

      <Card className="flex-1 flex flex-col rounded-lg border shadow-sm">
        <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 border-b">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="details" className="text-xs">รายละเอียด</TabsTrigger>
              <TabsTrigger value="files" className="text-xs">ไฟล์</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">Log</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold">บริษัท</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">{workOrder.company}</p>
            </div>

            {workOrder.description && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold">รายละเอียด</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap pl-5.5 leading-relaxed">
                  {workOrder.description}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Badge className={cn("text-xs", priorityColors[workOrder.priority])}>
                {priorityLabels[workOrder.priority]}
              </Badge>
            </div>

            {workOrder.deadline && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold">กำหนดส่ง</span>
                </div>
                <p className="text-xs text-muted-foreground pl-5.5">
                  {format(new Date(workOrder.deadline), 'dd MMM yyyy HH:mm', { locale: th })}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold">สร้างโดย</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">{workOrder.createdBy?.name || 'ไม่ทราบ'}</p>
              <p className="text-[10px] text-muted-foreground pl-5.5">
                {format(new Date(workOrder.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold">Checkpoints</span>
              </div>
              <p className="text-xs text-muted-foreground pl-5.5">
                {workOrder.checkpoints?.length || 0} จุดตรวจ
              </p>
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto px-3 py-3">
            {workOrder.attachments && workOrder.attachments.length > 0 ? (
              <div className="space-y-2">
                {workOrder.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{attachment.url.split('/').pop()}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" asChild>
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  ยังไม่มีไฟล์แนบ
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-y-auto px-3 py-3">
            {activityLogs.length > 0 ? (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-primary/30 pl-3 pb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">{log.user?.name || 'ไม่ทราบ'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd MMM HH:mm', { locale: th })}
                      </span>
                    </div>
                    <p className="text-xs font-medium">{log.action}</p>
                    {log.details && (
                      <p className="text-[10px] text-muted-foreground mt-1">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  ยังไม่มี activity log
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
