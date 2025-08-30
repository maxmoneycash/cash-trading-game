import React, { createContext, useContext, useMemo, useState, useCallback } from 'react'

export interface DebugMetadata {
  roundId?: string | null
  seed?: string | null
  userId?: string | null
  wallet?: string | null
  balance?: number | null
}

interface DebugContextValue {
  enabled: boolean
  apiBase: string
  connected: boolean
  setConnected: (v: boolean) => void
  isPaused: boolean
  setPaused: (v: boolean) => void
  overlayActive: boolean
  setOverlayActive: (v: boolean) => void
  metadata: DebugMetadata
  setMetadata: (m: Partial<DebugMetadata>) => void
  setLocalBalance?: (balance: number) => void
}

const DebugContext = createContext<DebugContextValue | undefined>(undefined)

export const useDebug = () => {
  const ctx = useContext(DebugContext)
  if (!ctx) throw new Error('useDebug must be used within DebugProvider')
  return ctx
}

export const DebugProvider: React.FC<{ enabled: boolean; children: React.ReactNode }> = ({ enabled, children }) => {
  const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3001'
  const [connected, setConnected] = useState(false)
  const [isPaused, setPaused] = useState(false)
  const [overlayActive, setOverlayActive] = useState(false)
  const [metadata, setMeta] = useState<DebugMetadata>({})

  const setMetadata = useCallback((m: Partial<DebugMetadata>) => {
    setMeta(prev => ({ ...prev, ...m }))
  }, [])

  const value = useMemo<DebugContextValue>(() => ({
    enabled,
    apiBase,
    connected,
    setConnected,
    isPaused,
    setPaused,
    overlayActive,
    setOverlayActive,
    metadata,
    setMetadata,
    setLocalBalance: undefined,
  }), [enabled, apiBase, connected, isPaused, overlayActive, metadata, setMetadata])

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
}

export const DebugConsumer = DebugContext
