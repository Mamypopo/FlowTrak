import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: SocketIOServer | null = null

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io
  }

  const port = process.env.PORT || '3001'
  const host = process.env.HOST || '0.0.0.0'
  const origin = process.env.NEXTAUTH_URL || `http://localhost:${port}`
  
  io = new SocketIOServer(server, {
    cors: {
      origin: origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })

    socket.on('join:work', (workId: string) => {
      socket.join(`work:${workId}`)
      console.log(`Client ${socket.id} joined work:${workId}`)
    })

    socket.on('leave:work', (workId: string) => {
      socket.leave(`work:${workId}`)
      console.log(`Client ${socket.id} left work:${workId}`)
    })
  })

  return io
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

