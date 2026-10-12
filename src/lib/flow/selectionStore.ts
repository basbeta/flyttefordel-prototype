// CR-023: Browser-side store for the flow selection (sessionStorage + memory, see stringStore).

import { SELECTION_STORAGE_KEY } from './flowSelection'
import { createSessionStringStore } from './stringStore'

const store = createSessionStringStore(SELECTION_STORAGE_KEY)

export const subscribe = store.subscribe
export const getSnapshot = store.getSnapshot
export const getServerSnapshot = store.getServerSnapshot
export const writeRaw = store.write

// For tests only.
export const resetSelectionStoreForTests = store.resetForTests
