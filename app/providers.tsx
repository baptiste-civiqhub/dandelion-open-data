'use client'

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache opt-in par requête (staleTime local), comme dans l'app de référence.
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0
      }
    }
  })
}

let browserQueryClient: QueryClient | undefined

// Un client par requête côté serveur (pas de fuite de cache entre visiteurs), un singleton dans le navigateur.
function getQueryClient() {
  if (isServer) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const queryClient = getQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
