// API Integration Layer for StableStream USDC Platform
// This file provides functions to interact with the backend API
// Replace the mock data with actual API calls when integrating with your backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api"

// Helper function for API requests
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const defaultHeaders = {
    "Content-Type": "application/json",
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "An error occurred" }))
      throw new Error(error.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("[v0] API request failed:", error)
    throw error
  }
}

// Authentication API
export const authAPI = {
  getNonce: async (): Promise<{ nonce: string }> => {
    return apiRequest("/auth/nonce", { method: "POST" })
  },

  verify: async (message: string, signature: string): Promise<{ user: any; token: string }> => {
    return apiRequest("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature }),
    })
  },

  logout: async (): Promise<void> => {
    return apiRequest("/auth/logout", { method: "POST" })
  },

  getSession: async (): Promise<{ user: any } | null> => {
    return apiRequest("/auth/session")
  },
}

// Streams API
export const streamsAPI = {
  getAll: async (params?: {
    filter?: "outgoing" | "incoming" | "all"
    status?: "active" | "paused" | "completed" | "cancelled"
    page?: number
    limit?: number
  }): Promise<{ streams: any[]; total: number; page: number; limit: number }> => {
    const queryParams = new URLSearchParams(params as any).toString()
    return apiRequest(`/streams?${queryParams}`)
  },

  getById: async (id: string): Promise<any> => {
    return apiRequest(`/streams/${id}`)
  },

  create: async (data: {
    recipient: string
    amount: string
    startTime: number
    endTime: number
  }): Promise<{ streamId: string; transactionHash: string }> => {
    return apiRequest("/streams", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  pause: async (id: string): Promise<{ success: boolean; transactionHash: string }> => {
    return apiRequest(`/streams/${id}/pause`, { method: "PUT" })
  },

  resume: async (id: string): Promise<{ success: boolean; transactionHash: string }> => {
    return apiRequest(`/streams/${id}/resume`, { method: "PUT" })
  },

  cancel: async (id: string): Promise<{ success: boolean; refundAmount: string; transactionHash: string }> => {
    return apiRequest(`/streams/${id}`, { method: "DELETE" })
  },

  getBalance: async (id: string): Promise<{ balance: string; availableBalance: string }> => {
    return apiRequest(`/streams/${id}/balance`)
  },
}

// Recipients API
export const recipientsAPI = {
  getAll: async (): Promise<{ recipients: any[] }> => {
    return apiRequest("/recipients")
  },

  create: async (data: { address: string; label?: string }): Promise<any> => {
    return apiRequest("/recipients", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { label?: string }): Promise<any> => {
    return apiRequest(`/recipients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest(`/recipients/${id}`, { method: "DELETE" })
  },

  bulkImport: async (
    recipients: Array<{ address: string; label?: string }>,
  ): Promise<{ success: boolean; imported: number }> => {
    return apiRequest("/recipients/import", {
      method: "POST",
      body: JSON.stringify({ recipients }),
    })
  },
}

// Analytics API
export const analyticsAPI = {
  getOverview: async (): Promise<{
    totalBalance: string
    activeStreams: number
    totalRecipients: number
    monthlyVolume: string
    changes: {
      balance: number
      streams: number
      recipients: number
      volume: number
    }
  }> => {
    return apiRequest("/analytics/overview")
  },

  getStreams: async (
    period: "7d" | "30d" | "90d" | "1y" = "30d",
  ): Promise<{
    volumeByDay: Array<{ date: string; outgoing: string; incoming: string }>
    topRecipients: Array<{ address: string; label?: string; amount: string }>
  }> => {
    return apiRequest(`/analytics/streams?period=${period}`)
  },
}

// Wallet API
export const walletAPI = {
  getBalance: async (): Promise<{ balance: string; usdValue: string }> => {
    return apiRequest("/wallet/balance")
  },

  getTransactions: async (params?: {
    page?: number
    limit?: number
  }): Promise<{
    transactions: any[]
    total: number
    page: number
    limit: number
  }> => {
    const queryParams = new URLSearchParams(params as any).toString()
    return apiRequest(`/wallet/transactions?${queryParams}`)
  },

  deposit: async (amount: string): Promise<{ success: boolean; transactionHash: string }> => {
    return apiRequest("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ amount }),
    })
  },

  withdraw: async (amount: string): Promise<{ success: boolean; transactionHash: string }> => {
    return apiRequest("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount }),
    })
  },
}

// User API
export const userAPI = {
  getProfile: async (): Promise<{
    address: string
    ensName?: string
    email?: string
    emailVerified: boolean
    displayName?: string
    createdAt: number
  }> => {
    return apiRequest("/user/profile")
  },

  updateProfile: async (data: {
    ensName?: string
    email?: string
    displayName?: string
  }): Promise<any> => {
    return apiRequest("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  getSettings: async (): Promise<{
    notifications: {
      email: boolean
      streamStart: boolean
      streamEnd: boolean
      lowBalance: boolean
    }
    preferences: {
      currency: "USD" | "USDC"
      timezone: string
    }
  }> => {
    return apiRequest("/user/settings")
  },

  updateSettings: async (data: any): Promise<any> => {
    return apiRequest("/user/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}

// WebSocket connection for real-time updates
export class StreamWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(private url: string = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080") {}

  connect(onMessage: (data: any) => void, onError?: (error: Event) => void) {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log("[v0] WebSocket connected")
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (error) {
          console.error("[v0] Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[v0] WebSocket error:", error)
        if (onError) onError(error)
      }

      this.ws.onclose = () => {
        console.log("[v0] WebSocket disconnected")
        this.reconnect(onMessage, onError)
      }
    } catch (error) {
      console.error("[v0] Failed to create WebSocket:", error)
    }
  }

  private reconnect(onMessage: (data: any) => void, onError?: (error: Event) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`[v0] Reconnecting... Attempt ${this.reconnectAttempts}`)
      setTimeout(() => {
        this.connect(onMessage, onError)
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.error("[v0] WebSocket is not connected")
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Utility function to format USDC amounts (from wei to human-readable)
export function formatUSDC(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  return (value / 1000000).toFixed(2) // USDC has 6 decimals
}

// Utility function to parse USDC amounts (from human-readable to wei)
export function parseUSDC(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount
  return Math.floor(value * 1000000).toString() // USDC has 6 decimals
}
