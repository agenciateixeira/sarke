'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { FloatingChat } from '@/components/chat/FloatingChat'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
        <FloatingChat />
      </div>
    </ProtectedRoute>
  )
}
