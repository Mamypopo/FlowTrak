'use client'

import { Checkpoint } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Clock, AlertCircle, RotateCcw, TrendingUp, Sparkles, Play, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { useUser } from '@/contexts/user-context'

interface TimelineProps {
  checkpoints: Checkpoint[]
  onCheckpointClick?: (checkpoint: Checkpoint) => void
  selectedCheckpointId?: string
  onCheckpointAction?: (checkpointId: string, action: string) => void
  isLoading?: boolean
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    bgColor: 'bg-gray-500/10 dark:bg-gray-500/20',
    borderColor: 'border-gray-400/50 dark:border-gray-400/30',
    iconColor: 'text-gray-500 dark:text-gray-400',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    lineColor: 'bg-gray-300 dark:bg-gray-600',
    gradient: 'from-gray-400 to-gray-500',
    text: 'รอดำเนินการ',
    glow: 'shadow-gray-500/20'
  },
  PROCESSING: { 
    icon: TrendingUp, 
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
    borderColor: 'border-blue-400/50 dark:border-blue-400/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    lineColor: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600',
    text: 'กำลังดำเนินการ',
    glow: 'shadow-blue-500/30'
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    bgColor: 'bg-green-500/10 dark:bg-green-500/20',
    borderColor: 'border-green-400/50 dark:border-green-400/30',
    iconColor: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    lineColor: 'bg-green-500',
    gradient: 'from-green-400 to-green-600',
    text: 'เสร็จสิ้น',
    glow: 'shadow-green-500/30'
  },
  RETURNED: { 
    icon: RotateCcw, 
    bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    borderColor: 'border-yellow-400/50 dark:border-yellow-400/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    lineColor: 'bg-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    text: 'ส่งกลับ',
    glow: 'shadow-yellow-500/30'
  },
  PROBLEM: { 
    icon: AlertCircle, 
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    borderColor: 'border-red-400/50 dark:border-red-400/30',
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    lineColor: 'bg-red-500',
    gradient: 'from-red-400 to-red-600',
    text: 'มีปัญหา',
    glow: 'shadow-red-500/30'
  },
}

export function Timeline({ checkpoints, onCheckpointClick, selectedCheckpointId, onCheckpointAction, isLoading }: TimelineProps) {
  const { user: currentUser } = useUser()

  // Helper function to check if user can perform action
  const canPerformAction = (checkpoint: Checkpoint, action: string): { can: boolean; reason?: string } => {
    if (!currentUser) {
      return { can: false, reason: 'กรุณาเข้าสู่ระบบ' }
    }

    const isAdmin = currentUser.role === 'ADMIN'
    const isOwnerDept = currentUser.departmentId === checkpoint.ownerDeptId

    // Check department permission (except for ADMIN)
    if (!isAdmin && !isOwnerDept) {
      return { can: false, reason: 'คุณไม่มีสิทธิ์ดำเนินการ checkpoint นี้ (ต้องเป็นสมาชิกของแผนกที่รับผิดชอบ)' }
    }

    // Check status validation
    if (action === 'start' && checkpoint.status !== 'PENDING') {
      return { can: false, reason: `ไม่สามารถเริ่ม checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

    if (action === 'complete' && checkpoint.status !== 'PROCESSING') {
      return { can: false, reason: `ไม่สามารถเสร็จสิ้น checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

    if ((action === 'return' || action === 'problem') && checkpoint.status !== 'PROCESSING') {
      return { can: false, reason: `ไม่สามารถ${action === 'return' ? 'ส่งกลับ' : 'รายงานปัญหา'} checkpoint ที่มีสถานะ "${checkpoint.status}" ได้` }
    }

    // Check sequential order for 'start' action
    // Sort checkpoints by order first
    const sortedCheckpoints = [...checkpoints].sort((a, b) => (a.order || 0) - (b.order || 0))
    if (action === 'start') {
      const currentIndex = sortedCheckpoints.findIndex(cp => cp.id === checkpoint.id)
      if (currentIndex > 0) {
        const previousCheckpoints = sortedCheckpoints.slice(0, currentIndex)
        const incompletePrevious = previousCheckpoints.find(cp => cp.status !== 'COMPLETED')
        if (incompletePrevious) {
          return { can: false, reason: `ไม่สามารถเริ่ม checkpoint นี้ได้ เนื่องจาก checkpoint ก่อนหน้านี้ "${incompletePrevious.name}" ยังไม่เสร็จสิ้น` }
        }
      }
    }

    return { can: true }
  }

  // Check if checkpoint is blocked (waiting for previous)
  const isBlocked = (checkpoint: Checkpoint): boolean => {
    // Sort checkpoints by order first
    const sortedCheckpoints = [...checkpoints].sort((a, b) => (a.order || 0) - (b.order || 0))
    const currentIndex = sortedCheckpoints.findIndex(cp => cp.id === checkpoint.id)
    if (currentIndex > 0) {
      const previousCheckpoints = sortedCheckpoints.slice(0, currentIndex)
      return previousCheckpoints.some(cp => cp.status !== 'COMPLETED')
    }
    return false
  }
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="w-full overflow-x-auto pb-6">
          <div className="flex items-start justify-center gap-6 min-w-max px-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-start gap-0 flex-shrink-0 p-6">
                <div className="relative flex flex-col items-center w-64 p-5">
                  {/* Icon Circle Skeleton */}
                  <Skeleton className="h-14 w-14 rounded-full mb-3" />
                  
                  {/* Content Skeleton */}
                  <div className="w-full text-center space-y-2">
                    <Skeleton className="h-4 w-32 mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto rounded-full" />
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!checkpoints || checkpoints.length === 0) {
    return (
      <div className="w-full p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
          <Clock className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">ยังไม่มี checkpoint</p>
        <p className="text-sm text-muted-foreground mt-2">สร้างงานใหม่เพื่อเริ่มต้น</p>
      </div>
    )
  }

  // Sort checkpoints by order to ensure correct sequence
  const sortedCheckpoints = [...checkpoints].sort((a, b) => (a.order || 0) - (b.order || 0))

  // Calculate progress
  const completedCount = sortedCheckpoints.filter(cp => cp.status === 'COMPLETED').length
  const progress = (completedCount / sortedCheckpoints.length) * 100

  return (
    <div className="w-full">
      {/* Timeline */}
      <div className="w-full overflow-x-auto pb-6">
        <div className="flex items-start justify-center gap-6 min-w-max px-4">
          {sortedCheckpoints.map((checkpoint, index) => {
            const config = statusConfig[checkpoint.status]
            const Icon = config.icon
            const isLast = index === checkpoints.length - 1
            const isSelected = selectedCheckpointId === checkpoint.id
            const isCompleted = checkpoint.status === 'COMPLETED'
            const isProcessing = checkpoint.status === 'PROCESSING'
            const isPending = checkpoint.status === 'PENDING'
            const allPreviousCompleted = sortedCheckpoints.slice(0, index).every(cp => cp.status === 'COMPLETED')
            const blocked = isBlocked(checkpoint)
            
            // Check permissions for actions
            const canStart = canPerformAction(checkpoint, 'start')
            const canComplete = canPerformAction(checkpoint, 'complete')
            const canReturn = canPerformAction(checkpoint, 'return')
            const canProblem = canPerformAction(checkpoint, 'problem')

            return (
              <div key={checkpoint.id} className="relative flex items-start gap-0 flex-shrink-0 overflow-visible">
                {/* Checkpoint Item */}
                <div 
                  className={cn(
                    "relative flex flex-col items-center w-64 p-5",
                    onCheckpointClick && "cursor-pointer"
                  )}
                  onClick={() => onCheckpointClick?.(checkpoint)}
                >

                  {/* Icon Circle with enhanced styling */}
                  <div className={cn(
                    "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 mb-3",
                    config.iconBg,
                    config.borderColor,
                    isCompleted && "shadow-lg",
                    isProcessing && config.glow,
                    blocked && !isCompleted && "opacity-60"
                  )}>
                    <Icon className={cn("h-7 w-7 z-10", config.iconColor)} />
                    
                    {/* Pulse animation for processing */}
                    {isProcessing && (
                      <>
                        <span className="absolute inset-0 rounded-full animate-ping opacity-75 bg-blue-500" />
                        <span className="absolute inset-0 rounded-full animate-pulse bg-blue-500/20" />
                      </>
                    )}

                    {/* Success checkmark overlay for completed */}
                    {isCompleted && (
                      <div className="absolute inset-0 rounded-full bg-green-500/20 animate-in fade-in duration-300" />
                    )}

                    {/* Sparkle effect for selected */}
                    {isSelected && (
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse z-20" />
                    )}

                    {/* Lock icon for blocked checkpoints - positioned at bottom right to avoid overlap */}
                    {blocked && !isCompleted && (
                      <div className="absolute -bottom-1 -right-1 bg-muted border-2 border-background rounded-full p-0.5 z-20 shadow-sm">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>


                  {/* Content */}
                  <div className="w-full text-center space-y-2">
                    <h4 className={cn(
                      "text-sm font-bold line-clamp-2 transition-colors leading-tight",
                      isSelected ? "text-primary" : "text-foreground",
                      blocked && !isCompleted && "opacity-60"
                    )}>
                      {checkpoint.name}
                    </h4>
                    
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-medium border",
                        config.bgColor,
                        config.iconColor,
                        config.borderColor,
                        blocked && !isCompleted && "opacity-60"
                      )}
                    >
                      {config.text}
                    </Badge>
                    
                    {/* Blocked indicator */}
                    {blocked && !isCompleted && (
                      <div className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span>รอ checkpoint ก่อนหน้า</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        isCompleted ? "bg-green-500" : isProcessing ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                      )} />
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {checkpoint.ownerDept.name}
                      </p>
                    </div>

                    {/* Time Info with better styling */}
                    {(checkpoint.startedAt || checkpoint.endedAt) && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                        {checkpoint.startedAt && (
                          <div className="flex items-center justify-center gap-1.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(checkpoint.startedAt), 'dd MMM HH:mm', { locale: th })}
                            </p>
                          </div>
                        )}
                        {checkpoint.endedAt && (
                          <div className="flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {format(new Date(checkpoint.endedAt), 'dd MMM HH:mm', { locale: th })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons - Inline & Compact */}
                    {isSelected && onCheckpointAction && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {checkpoint.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (canStart.can) {
                                  onCheckpointAction(checkpoint.id, 'start')
                                }
                              }}
                              disabled={!canStart.can}
                              className={cn(
                                "h-8 px-3 text-xs bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm",
                                !canStart.can && "opacity-50 cursor-not-allowed"
                              )}
                              title={canStart.reason}
                            >
                              <Play className="h-3 w-3 mr-1.5" />
                              เริ่ม
                            </Button>
                          )}
                          {checkpoint.status === 'PROCESSING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (canComplete.can) {
                                    onCheckpointAction(checkpoint.id, 'complete')
                                  }
                                }}
                                disabled={!canComplete.can}
                                className={cn(
                                  "h-8 px-3 text-xs bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-600 text-white shadow-sm",
                                  !canComplete.can && "opacity-50 cursor-not-allowed"
                                )}
                                title={canComplete.reason}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                เสร็จ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (canReturn.can) {
                                    onCheckpointAction(checkpoint.id, 'return')
                                  }
                                }}
                                disabled={!canReturn.can}
                                className={cn(
                                  "h-8 px-3 text-xs border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/10",
                                  !canReturn.can && "opacity-50 cursor-not-allowed"
                                )}
                                title={canReturn.reason}
                              >
                                <RotateCcw className="h-3 w-3 mr-1.5" />
                                ส่งกลับ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (canProblem.can) {
                                    onCheckpointAction(checkpoint.id, 'problem')
                                  }
                                }}
                                disabled={!canProblem.can}
                                className={cn(
                                  "h-8 px-3 text-xs border-red-500/50 hover:border-red-500 hover:bg-red-500/10",
                                  !canProblem.can && "opacity-50 cursor-not-allowed"
                                )}
                                title={canProblem.reason}
                              >
                                <AlertCircle className="h-3 w-3 mr-1.5" />
                                ปัญหา
                              </Button>
                            </>
                          )}
                        </div>
                        {/* Show reason if action is disabled */}
                        {((checkpoint.status === 'PENDING' && !canStart.can) ||
                          (checkpoint.status === 'PROCESSING' && (!canComplete.can || !canReturn.can || !canProblem.can))) && (
                          <p className="text-xs text-muted-foreground mt-2 text-center px-2">
                            {checkpoint.status === 'PENDING' && canStart.reason}
                            {checkpoint.status === 'PROCESSING' && (
                              canComplete.reason || canReturn.reason || canProblem.reason
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection Line - positioned between checkpoints */}
                {!isLast && (
                  <div className="absolute top-[56px] left-full w-6 h-0.5 flex items-center z-0 pointer-events-none">
                    <div className={cn(
                      "h-0.5 w-full rounded-full transition-all duration-500",
                      allPreviousCompleted && isCompleted
                        ? config.lineColor
                        : allPreviousCompleted
                        ? `${config.lineColor} opacity-50`
                        : "bg-muted dark:bg-muted-foreground/30"
                    )} />
                    {/* Animated dot on line */}
                    {isProcessing && (
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
                        config.lineColor,
                        "animate-pulse"
                      )} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
