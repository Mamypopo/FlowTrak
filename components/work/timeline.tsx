'use client'

import { Checkpoint } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Clock, AlertCircle, RotateCcw, TrendingUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

interface TimelineProps {
  checkpoints: Checkpoint[]
  onCheckpointClick?: (checkpoint: Checkpoint) => void
  selectedCheckpointId?: string
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

export function Timeline({ checkpoints, onCheckpointClick, selectedCheckpointId }: TimelineProps) {
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

  // Calculate progress
  const completedCount = checkpoints.filter(cp => cp.status === 'COMPLETED').length
  const progress = (completedCount / checkpoints.length) * 100

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">ความคืบหน้า</span>
          <span className="text-sm font-semibold text-foreground">
            {completedCount} / {checkpoints.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full overflow-x-auto pb-6">
        <div className="flex items-start justify-center gap-6 min-w-max px-4">
          {checkpoints.map((checkpoint, index) => {
            const config = statusConfig[checkpoint.status]
            const Icon = config.icon
            const isLast = index === checkpoints.length - 1
            const isSelected = selectedCheckpointId === checkpoint.id
            const isCompleted = checkpoint.status === 'COMPLETED'
            const isProcessing = checkpoint.status === 'PROCESSING'
            const isPending = checkpoint.status === 'PENDING'
            const allPreviousCompleted = checkpoints.slice(0, index).every(cp => cp.status === 'COMPLETED')

            return (
              <div key={checkpoint.id} className="flex items-start gap-0 flex-shrink-0 p-6">
                {/* Connection Line */}
                {!isLast && (
                  <div className="absolute top-16 left-full w-6 h-0.5 flex items-center z-0">
                    <div className={cn(
                      "h-1 w-full rounded-full transition-all duration-500",
                      allPreviousCompleted && isCompleted
                        ? `bg-gradient-to-r ${config.lineColor}`
                        : allPreviousCompleted
                        ? `bg-gradient-to-r ${config.lineColor} opacity-50`
                        : "bg-muted"
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

                {/* Checkpoint Card */}
                <Card
                  className={cn(
                    "relative flex flex-col items-center w-56 p-4 group cursor-pointer transition-all duration-300",
                    "border-2 hover:shadow-lg",
                    config.bgColor,
                    config.borderColor,
                    isSelected && "ring-2 ring-primary ring-offset-2 shadow-xl scale-105",
                    !isSelected && onCheckpointClick && "hover:scale-105 hover:shadow-md",
                    isCompleted && "border-green-400/50",
                    isProcessing && "border-blue-400/50"
                  )}
                  onClick={() => onCheckpointClick?.(checkpoint)}
                >
                  {/* Icon Circle with enhanced styling */}
                  <div className={cn(
                    "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 mb-3",
                    config.iconBg,
                    config.borderColor,
                    isSelected && "ring-4 ring-primary/30 scale-110",
                    onCheckpointClick && "group-hover:scale-110",
                    isCompleted && "shadow-lg",
                    isProcessing && config.glow
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
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-primary animate-pulse" />
                    )}
                  </div>

                  {/* Order Badge */}
                  <div className={cn(
                    "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    isCompleted 
                      ? "bg-green-500 text-white" 
                      : isProcessing 
                      ? "bg-blue-500 text-white" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className={cn(
                    "w-full text-center space-y-2 transition-all duration-200",
                    isSelected && "scale-105"
                  )}>
                    <h4 className={cn(
                      "text-sm font-bold line-clamp-2 transition-colors leading-tight",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {checkpoint.name}
                    </h4>
                    
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-medium border",
                        config.bgColor,
                        config.iconColor,
                        config.borderColor
                      )}
                    >
                      {config.text}
                    </Badge>
                    
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
                  </div>

                  {/* Hover effect overlay */}
                  {onCheckpointClick && (
                    <div className="absolute inset-0 rounded-lg bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
                  )}
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
