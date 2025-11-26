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

    const result = await Swal.fire({
      title: 'ยืนยันการดำเนินการ',
      text: `คุณต้องการ${actionLabels[action]} checkpoint นี้หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    })

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
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        })

        fetchWorkOrder()

        if (socket) {
          socket.emit('checkpoint:updated', data.checkpoint)
        }
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: data.error || 'กรุณาลองใหม่อีกครั้ง',
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

  const handleCheckpointClick = (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint)
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline Section - Large & Prominent */}
        <div className="bg-gradient-to-b from-card via-card/95 to-background border-b shadow-sm">
          <div className="container mx-auto px-6 py-8">
            <div className="flex justify-center">
              <Timeline 
                checkpoints={workOrder.checkpoints || []} 
                onCheckpointClick={handleCheckpointClick}
                selectedCheckpointId={selectedCheckpoint?.id}
              />
            </div>
            
            {/* Action Buttons */}
            {workOrder.checkpoints && workOrder.checkpoints.length > 0 && selectedCheckpoint && (
              <div className="mt-12 p-6 bg-gradient-to-br from-card to-card/50 border-2 border-primary/20 rounded-2xl shadow-lg max-w-2xl mx-auto backdrop-blur-sm">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold">{selectedCheckpoint.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{selectedCheckpoint.ownerDept.name}</span>
                      <span>•</span>
                      <span>ลำดับที่ {selectedCheckpoint.order}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {selectedCheckpoint.status === 'PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'start')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      เริ่มดำเนินการ
                    </Button>
                  )}
                  {selectedCheckpoint.status === 'PROCESSING' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'complete')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        เสร็จสิ้น
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'return')}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        ส่งกลับ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckpointAction(selectedCheckpoint.id, 'problem')}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        แจ้งปัญหา
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Job (20%) | Comment (60%) | Info (20%) - Best UX */}
        <div className="flex-1 flex overflow-hidden bg-background">
          {/* Left - Job List (20% - Compact) */}
          <div className="w-[20%] min-w-[240px] shrink-0 hidden lg:block border-r bg-muted/30">
            <div className="h-full py-4 pl-4 pr-3">
              <WorkSidebar
                selectedWorkId={workId}
                onSelectWork={handleSelectWork}
              />
            </div>
          </div>

          {/* Center - Comments (60% - Main Focus) */}
          <div className="flex-1 min-w-0 flex flex-col">
            <CommentsPanel
              checkpoint={selectedCheckpoint}
              workId={workId}
              workOrder={workOrder}
            />
          </div>

          {/* Right - Info (20% - Compact) */}
          <div className="w-[20%] min-w-[260px] shrink-0 hidden xl:block border-l bg-muted/20">
            <div className="h-full py-4 pl-3 pr-4">
              <InfoPanel workOrder={workOrder} />
            </div>
          </div>
        </div>

        {/* Tablet/Mobile: Stack layout */}
        <div className="lg:hidden border-t">
          <div className="p-4 space-y-4">
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
