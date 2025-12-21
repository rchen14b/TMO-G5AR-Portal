"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Github } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed")
    if (savedCollapsed !== null) {
      setSidebarCollapsed(savedCollapsed === "true")
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <main className={`transition-all duration-300 flex-1 ${sidebarCollapsed ? "pl-[72px]" : "pl-52"}`}>
        <div className="p-8">
          {children}
        </div>
      </main>
      <footer className={`transition-all duration-300 border-t border-border/40 py-6 px-8 ${sidebarCollapsed ? "pl-[calc(72px+2rem)]" : "pl-[calc(13rem+2rem)]"}`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p>This project is open source and licensed under MIT.</p>
            <a
              href="https://github.com/rchen14b/TMO-G5AR-Portal"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>View on GitHub</span>
            </a>
          </div>
          <p className="text-xs text-muted-foreground/70">
            Not affiliated with T-Mobile or Arcadyan. All trademarks belong to their respective owners.
          </p>
        </div>
      </footer>
    </div>
  )
}
