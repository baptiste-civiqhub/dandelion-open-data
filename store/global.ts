import { create } from 'zustand'

// État UI global uniquement. Jamais de données serveur ici : elles vivent dans le cache TanStack Query.
type State = {
  loading: boolean
}

type Actions = {
  setLoading: (loading: boolean) => void
}

export const useGlobalStore = create<State & Actions>((set) => ({
  loading: false,
  setLoading: (loading) => set(() => ({ loading }))
}))
