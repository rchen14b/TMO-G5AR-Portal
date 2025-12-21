"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Globe, User, Lock } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const [routerIp, setRouterIp] = useState("192.168.12.1")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberUsername, setRememberUsername] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Load saved settings on mount
  useEffect(() => {
    const savedIp = localStorage.getItem("router_ip")
    if (savedIp) {
      setRouterIp(savedIp)
    }

    const savedUsername = localStorage.getItem("remembered_username")
    if (savedUsername) {
      setUsername(savedUsername)
      setRememberUsername(true)
    } else {
      setUsername("admin") // Default username
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/router/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, routerIp }),
      })

      const data = await response.json()

      if (data.success) {
        // Save router IP
        localStorage.setItem("router_ip", routerIp)

        // Save or clear remembered username
        if (rememberUsername) {
          localStorage.setItem("remembered_username", username)
        } else {
          localStorage.removeItem("remembered_username")
        }
        router.push("/")
      } else {
        setError(data.error || "Login failed")
      }
    } catch (err) {
      setError("Connection failed. Is the gateway reachable?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-bg opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Decorative elements */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-magenta-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl" />

      {/* Login card */}
      <div className="relative w-full max-w-md">
        <div className="glass-card rounded-3xl p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-4">
            <Image
              src="/logo.svg"
              alt="5G Gateway"
              width={56}
              height={48}
            />
            <div>
              <h1 className="text-2xl font-bold">G5AR Portal</h1>
              <p className="text-muted-foreground">T-Mobile Gateway Administration</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="routerIp">Gateway IP</Label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="routerIp"
                  type="text"
                  value={routerIp}
                  onChange={(e) => setRouterIp(e.target.value)}
                  placeholder="192.168.12.1"
                  className="h-12 pl-12 rounded-xl bg-white/50 dark:bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="h-12 pl-12 rounded-xl bg-white/50 dark:bg-white/5 border-white/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 pl-12 pr-12 rounded-xl bg-white/50 dark:bg-white/5 border-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberUsername}
                onChange={(e) => setRememberUsername(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/50 dark:bg-white/5 text-primary focus:ring-primary/50"
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember username
              </Label>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#e20074] hover:bg-[#c90066] transition-colors text-white font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Default credentials are on your gateway label
          </p>
        </div>
      </div>
    </div>
  )
}
