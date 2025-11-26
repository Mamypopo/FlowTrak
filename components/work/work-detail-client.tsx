'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Timeline } from '@/components/work/timeline'
import { CommentsPanel } from '@/components/work/comments-panel'
import { InfoPanel } from '@/components/work/info-panel'
import { WorkSidebar } from '@/components/work/work-sidebar'
import { WorkOrder, Checkpoint } from '@/types'
import { Button } from '@/components/ui/button'
import { Play, CheckCircle, RotateCcw, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'
import { getSwalConfig } from '@/lib/swal-config'
import { useSocket } from '@/lib/socket-client'

interface WorkDetailClientProps {
  workId: string
}

export function WorkDetailClient({ workId }: WorkDetailClientProps) {
  const router = useRouter()
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null)
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null)
  const socket = useSocket()
  const joinedWorkIdRef = useRef<string | null>(null)

  const handleSelectWork = (newWorkId: string) => {
    if (newWorkId !== workId) {
      router.push(`/work/${newWorkId}`)
    }
  }

  const fetchWorkOrder = async () => {
    const res = await fetch(`/api/work/${workId}`)
    const data = await res.json()
    if (data.workOrder) {
      setWorkOrder(data.workOrder)
    }
  }

  useEffect(() => {
    fetchWorkOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workId])

  // Memoized event handler to prevent unnecessary re-renders
  const handleCheckpointUpdated = useCallback((updatedCheckpoint: Checkpoint) => {
    setWorkOrder((prev) => {
      if (!prev) return null
      return {
        ...prev,
        checkpoints: prev.checkpoints?.map((cp) =>
          cp.id === updatedCheckpoint.id ? updatedCheckpoint : cp
        ),
      }
    })
  }, [])

  // Socket room management - join/leave when workId changes
  useEffect(() => {
    if (!socket || !workId) return

    let isMounted = true

    // Leave previous room if workId changed
    if (joinedWorkIdRef.current && joinedWorkIdRef.current !== workId) {
      socket.emit('leave:work', joinedWorkIdRef.current)
      joinedWorkIdRef.current = null
    }

    // Join new room if not already joined
    if (joinedWorkIdRef.current !== workId && isMounted) {
      socket.emit('join:work', workId)
      joinedWorkIdRef.current = workId
    }

    socket.on('checkpoint:updated', handleCheckpointUpdated)

    return () => {
      isMounted = false
      socket.off('checkpoint:updated', handleCheckpointUpdated)
      // Only leave room on unmount, not on workId change (handled above)
      if (joinedWorkIdRef.current === workId) {
        socket.emit('leave:work', workId)
        joinedWorkIdRef.current = null
      }
    }
  }, [socket, workId, handleCheckpointUpdated])

  const handleCheckpointAction = async (checkpointId: string, action: string) => {
    const actionLabels: Record<string, string> = {
      start: 'เริ่มดำเนินการ',
      complete: 'เสร็จสิ้น',
      return: 'ส่งกลับ',
      problem: 'มีปัญหา',
    }

    const result = await Swal.fire(getSwalConfig({
      title: 'ยืนยันการดำเนินการ',
      text: `คุณต้องการ${actionLabels[action]} checkpoint นี้หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    }))

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`/api/checkpoint/${checkpointId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()

      if (res.ok) {
        await Swal.fire(getSwalConfig({
          icon: 'success',
          title: 'สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        }))

        fetchWorkOrder()

        if (socket) {
          socket.emit('checkpoint:updated', data.checkpoint)
        }
      } else {
        await Swal.fire(getSwalConfig({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'กรุณาลองใหม่อีกครั้ง',
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

  const handleCheckpointClick = (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint)
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card/50 to-background">
        <div className="text-center space-y-4 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-pulse">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-muted-foreground font-medium">กำลังโหลดข้อมูลงาน...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
        {/* Timeline Section - Compact & Responsive */}
        <div className="relative bg-gradient-to-b from-card via-card/98 to-background/95 border-b border-border/50 shadow-md overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-30" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          <div className="relative container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
            {/* Timeline */}
            <div className="flex justify-center">
              <Timeline 
                checkpoints={workOrder.checkpoints || []} 
                onCheckpointClick={handleCheckpointClick}
                selectedCheckpointId={selectedCheckpoint?.id}
                onCheckpointAction={handleCheckpointAction}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Responsive Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gradient-to-b from-background to-muted/20">
          {/* Left - Job List (Hidden on mobile, visible on md+) */}
          <div className="hidden md:block md:flex-shrink-0 md:w-[25%] lg:w-[24%] xl:w-[25%] md:max-w-[350px] lg:max-w-[380px] md:min-w-[260px] lg:min-w-[300px] border-r border-border/50 bg-gradient-to-b from-muted/40 to-muted/20 backdrop-blur-sm overflow-hidden">
            <WorkSidebar
              selectedWorkId={workId}
              onSelectWork={handleSelectWork}
            />
          </div>

          {/* Center - Comments (Full width on mobile, flex-1 on desktop) */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background/50 backdrop-blur-sm">
            <CommentsPanel
              checkpoint={selectedCheckpoint}
              workId={workId}
              workOrder={workOrder}
            />
          </div>

          {/* Right - Info (Hidden on mobile/tablet, visible on xl+) */}
          <div className="hidden xl:block flex-shrink-0 w-[28%] max-w-[420px] min-w-[320px] border-l border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 backdrop-blur-sm overflow-hidden">
            <InfoPanel 
              workOrder={workOrder} 
              onWorkOrderUpdate={fetchWorkOrder}
            />
          </div>
        </div>

        {/* Mobile: Compact Stack layout */}
        <div className="md:hidden border-t border-border/50 bg-muted/20">
          <div className="p-3 space-y-3">
            <WorkSidebar
              selectedWorkId={workId}
              onSelectWork={handleSelectWork}
            />
            {selectedCheckpoint && (
              <CommentsPanel
                checkpoint={selectedCheckpoint}
                workId={workId}
                workOrder={workOrder}
              />
            )}
          </div>
        </div>
    </div>
  )
}
