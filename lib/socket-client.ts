'use client'

import { io, Socket } from 'socket.io-client'
import { useEffect, useState } from 'react'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.close()
    }
  }, [])

  return socket
}

