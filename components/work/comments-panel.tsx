'use client'

import { useState, useEffect, useRef } from 'react'
import { Comment, Checkpoint, WorkOrder } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { 
  Send, 
  Paperclip, 
  User, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  RotateCcw,
  Smile,
  Image as ImageIcon,
  FileText,
  X
} from 'lucide-react'
import { useSocket } from '@/lib/socket-client'
import { cn } from '@/lib/utils'

interface CommentsPanelProps {
  checkpoint: Checkpoint | null
  workId: string
  workOrder?: WorkOrder | null
}

const statusConfig = {
  PENDING: { 
    icon: Clock, 
    color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
    label: 'รอดำเนินการ' 
  },
  PROCESSING: { 
    icon: TrendingUp, 
    color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    label: 'กำลังดำเนินการ' 
  },
  COMPLETED: { 
    icon: CheckCircle2, 
    color: 'bg-green-500/20 text-green-600 dark:text-green-400',
    label: 'เสร็จสิ้น' 
  },
  RETURNED: { 
    icon: RotateCcw, 
    color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    label: 'ส่งกลับ' 
  },
  PROBLEM: { 
    icon: AlertTriangle, 
    color: 'bg-red-500/20 text-red-600 dark:text-red-400',
    label: 'มีปัญหา' 
  },
}

export function CommentsPanel({ checkpoint, workId, workOrder }: CommentsPanelProps) {
  const [activeTab, setActiveTab] = useState<'work' | 'checkpoint'>('work')
  const [workComments, setWorkComments] = useState<Comment[]>([])
  const [checkpointComments, setCheckpointComments] = useState<Comment[]>([])
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const socket = useSocket()
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchWorkComments = async () => {
    const res = await fetch(`/api/comment?workId=${workId}`)
    const data = await res.json()
    if (data.comments) {
      setWorkComments(data.comments)
    }
  }

  const fetchCheckpointComments = async () => {
    if (!checkpoint) return
    const res = await fetch(`/api/comment?checkpointId=${checkpoint.id}`)
    const data = await res.json()
    if (data.comments) {
      setCheckpointComments(data.comments)
    }
  }

  useEffect(() => {
    if (activeTab === 'work') {
      fetchWorkComments()
    } else if (checkpoint) {
      fetchCheckpointComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, checkpoint, workId])

  useEffect(() => {
    if (socket && workId) {
      socket.emit('join:work', workId)

      socket.on('comment:new', (newComment: Comment) => {
        if (newComment.workId === workId && !newComment.checkpointId) {
          setWorkComments((prev) => [...prev, newComment])
        } else if (newComment.checkpointId === checkpoint?.id) {
          setCheckpointComments((prev) => [...prev, newComment])
        }
      })

      return () => {
        socket.off('comment:new')
        socket.emit('leave:work', workId)
      }
    }
  }, [socket, checkpoint, workId])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [workComments, checkpointComments])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isWorkComment = activeTab === 'work'
    
    if ((!message.trim() && !file)) return

    const formData = new FormData()
    if (isWorkComment) {
      formData.append('workId', workId)
    } else if (checkpoint) {
      formData.append('checkpointId', checkpoint.id)
    }
    
    if (message.trim()) {
      formData.append('message', message)
    }
    if (file) {
      formData.append('file', file)
    }

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (isWorkComment) {
          setWorkComments((prev) => [...prev, data.comment])
        } else {
          setCheckpointComments((prev) => [...prev, data.comment])
        }
        setMessage('')
        setFile(null)
        setFileName('')
        
        if (socket) {
          socket.emit('comment:new', data.comment)
        }
      }
    } catch (error) {
      console.error('Error posting comment:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFileName(selectedFile.name)
    }
  }

  const removeFile = () => {
    setFile(null)
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderComments = (comments: Comment[]) => {
    if (comments.length === 0) {
      return (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            ยังไม่มีคอมเมนต์
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            เป็นคนแรกที่คอมเมนต์{activeTab === 'work' ? 'ในงานนี้' : 'ใน checkpoint นี้'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background">
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{comment.user.name}</span>
                {comment.checkpoint && (
                  <Badge variant="outline" className="text-xs">
                    {comment.checkpoint.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
                </span>
              </div>
              {comment.message && (
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed break-words">
                  {comment.message}
                </div>
              )}
              {comment.fileUrl && (
                <a
                  href={comment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                  <span>ไฟล์แนบ</span>
                </a>
              )}
            </div>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-3xl px-6 py-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'work' | 'checkpoint')}>
            <TabsList className="w-full justify-start bg-transparent h-auto p-0 gap-2">
              <TabsTrigger 
                value="work" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                คอมเมนต์งาน
              </TabsTrigger>
              <TabsTrigger 
                value="checkpoint" 
                disabled={!checkpoint}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-full px-4 py-2 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                คอมเมนต์ Checkpoint
                {checkpoint && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {checkpoint.name}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-3xl px-6 py-6">
          {activeTab === 'work' ? (
            renderComments(workComments)
          ) : checkpoint ? (
            renderComments(checkpointComments)
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  เลือก checkpoint เพื่อดูคอมเมนต์
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Input - Facebook/TikTok Style */}
      <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="container mx-auto max-w-3xl px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File Preview */}
            {file && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 truncate">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Input Container */}
            <div className={cn(
              "relative flex items-end gap-2 p-3 rounded-2xl border-2 transition-all",
              isFocused 
                ? "border-primary bg-background shadow-lg" 
                : "border-border bg-muted/30"
            )}>
              {/* File Upload Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 p-0 shrink-0 rounded-full hover:bg-primary/10"
              >
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={activeTab === 'work' ? 'เขียนคอมเมนต์ในงาน...' : 'เขียนคอมเมนต์ใน checkpoint...'}
                  className="w-full resize-none bg-transparent border-0 focus:outline-none text-sm placeholder:text-muted-foreground max-h-[120px] overflow-y-auto"
                  rows={1}
                />
              </div>

              {/* Emoji Button (Placeholder) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 shrink-0 rounded-full hover:bg-primary/10"
              >
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>

              {/* Send Button */}
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() && !file}
                className={cn(
                  "h-9 px-4 rounded-full shrink-0 transition-all",
                  message.trim() || file
                    ? "bg-primary hover:bg-primary/90 shadow-md"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
