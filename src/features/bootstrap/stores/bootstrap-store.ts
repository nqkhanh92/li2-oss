import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const oneTimeEvents = {
  FIRST_200_PREMIUM_GRANT: 'FIRST_200_PREMIUM_GRANT',
  MIGRATE_FROM_ANONYMOUS: 'MIGRATE_FROM_ANONYMOUS',
}

const multipleEvents = {
  LOGIN_COMPLETED: 'LOGIN_COMPLETED',
}

export const availableEvents = {
  ...oneTimeEvents,
  ...multipleEvents,
}
export const availableEventsList = Object.values(availableEvents)

export type AvailableEvents = keyof typeof availableEvents

type BootstrapState = {
  userId: string | null
  completedEvents: AvailableEvents[] | null
  idle: boolean
  dispatch: (action: Action) => void
  eventQueue: AvailableEvents[]
}

type Action =
  | { type: 'COMPLETED_EVENT'; payload: AvailableEvents }
  | { type: 'SET_USER_ID'; payload: string }
  | { type: 'SET_COMPLETED_EVENTS'; payload: AvailableEvents[] }
  | { type: 'RESET' }
  | { type: 'SET_IDLE'; payload: boolean }
  | { type: 'ADD_EVENT_TO_QUEUE'; payload: AvailableEvents }
  | { type: 'MOVE_EVENT_TO_END'; payload: AvailableEvents }
  | { type: 'REMOVE_EVENT_FROM_QUEUE'; payload: AvailableEvents }

// Reducer function
const reducer = (state: BootstrapState, action: Action): BootstrapState => {
  switch (action.type) {
    case 'COMPLETED_EVENT': {
      const events = state.completedEvents || []
      const newQueue = state.eventQueue.filter((event) => event !== action.payload)

      // Always return a new state object to trigger persistence
      if (events.includes(action.payload)) {
        return {
          ...state,
          idle: true,
          eventQueue: newQueue,
        }
      }

      return {
        ...state,
        completedEvents: [...events, action.payload],
        idle: true,
        eventQueue: newQueue,
      }
    }
    case 'SET_IDLE':
      return { ...state, idle: action.payload }
    case 'SET_USER_ID':
      return { ...state, userId: action.payload }
    case 'SET_COMPLETED_EVENTS':
      return { ...state, completedEvents: action.payload, idle: true }
    case 'RESET':
      return { ...state, completedEvents: null, userId: null, idle: true }
    case 'ADD_EVENT_TO_QUEUE':
      const newQueue = new Set([...state.eventQueue, action.payload])
      return { ...state, eventQueue: Array.from(newQueue) }
    case 'MOVE_EVENT_TO_END':
      const queue = state.eventQueue.filter((event) => event !== action.payload)
      return { ...state, eventQueue: [...queue, action.payload] }
    case 'REMOVE_EVENT_FROM_QUEUE':
      const remainingQueue = state.eventQueue.filter((event) => event !== action.payload)
      return { ...state, eventQueue: remainingQueue }
    default:
      return state
  }
}

export const useBootstrapStore = create<BootstrapState>()(
  persist(
    (set, get) => ({
      userId: null,
      completedEvents: null,
      idle: true,
      eventQueue: [],
      dispatch: (action) => set((state) => reducer(state, action)),
    }),
    {
      name: 'bootstrap-events',
    }
  )
)
