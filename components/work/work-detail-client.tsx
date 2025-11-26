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
              />
            </div>
            
            {/* Action Buttons - Compact Design */}
            {workOrder.checkpoints && workOrder.checkpoints.length > 0 && selectedCheckpoint && (
              <div className="mt-4 md:mt-6">
                <div className="relative p-4 md:p-6 bg-gradient-to-br from-card via-card/95 to-card/90 border border-primary/20 md:border-2 md:border-primary/30 rounded-xl md:rounded-2xl shadow-lg max-w-2xl mx-auto backdrop-blur-sm overflow-hidden">
                  {/* Decorative Background - Smaller */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
                  <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-primary/5 rounded-full blur-2xl md:blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-primary/5 rounded-full blur-xl md:blur-2xl" />
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4 md:mb-5">
                      <div className="space-y-1.5 md:space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary animate-pulse shrink-0" />
                          <h3 className="text-base md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
                            {selectedCheckpoint.name}
                          </h3>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 md:gap-2 ml-3.5 md:ml-5 flex-wrap">
                          <span className="px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-primary/10 text-primary text-[10px] md:text-xs font-medium">
                            {selectedCheckpoint.ownerDept.name}
                          </span>
                          <span>•</span>
                          <span>ลำดับที่ {selectedCheckpoint.order}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 md:gap-3 flex-wrap">
                      {selectedCheckpoint.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'start')}
                          className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-300 text-xs md:text-sm"
                        >
                          <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <Play className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 relative z-10" />
                          <span className="relative z-10 font-semibold">เริ่มดำเนินการ</span>
                        </Button>
                      )}
                      {selectedCheckpoint.status === 'PROCESSING' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'complete')}
                            className="group relative overflow-hidden bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-300 text-xs md:text-sm"
                          >
                            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 relative z-10" />
                            <span className="relative z-10 font-semibold">เสร็จสิ้น</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'return')}
                            className="group relative overflow-hidden border hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all duration-300 text-xs md:text-sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 group-hover:rotate-180 transition-transform duration-300" />
                            <span className="font-semibold">ส่งกลับ</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'problem')}
                            className="group relative overflow-hidden border hover:border-red-500/50 hover:bg-red-500/10 transition-all duration-300 text-xs md:text-sm"
                          >
                            <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 group-hover:animate-pulse" />
                            <span className="font-semibold">แจ้งปัญหา</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
            <InfoPanel workOrder={workOrder} />
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
