'use client'

import { Nav } from './nav'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      {children}
    </div>
  )
}

