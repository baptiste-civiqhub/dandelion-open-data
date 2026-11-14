import { create } from 'zustand'

/** Position du joueur dans le jardin. État d'interface : le monde l'écrit, l'atlas la lit. */
export type WorldPose = {
  x: number
  z: number
  /** 0 = vers le nord (−Z), sens trigonométrique. */
  heading: number
}

type State = {
  pose: WorldPose | null
  setPose: (pose: WorldPose) => void
  clearPose: () => void
}

export const useWorldPoseStore = create<State>((set) => ({
  pose: null,
  setPose: (pose) =>
    set((state) => {
      const current = state.pose
      if (current && current.x === pose.x && current.z === pose.z && current.heading === pose.heading) return state
      return { pose }
    }),
  clearPose: () => set({ pose: null })
}))
