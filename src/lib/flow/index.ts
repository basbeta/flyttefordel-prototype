// CR-023: public surface of the flow module.
export {
  getFirstPageId,
  resolveFlowStep,
  type FlowPageRef,
  type FlowPosition,
  type FlowStep,
} from './flowNavigation'
export {
  SELECTION_STORAGE_KEY,
  buildSummary,
  parseSelection,
  sanitizeSelection,
  serializeSelection,
  toggleProduct,
  type FlowSelection,
  type SummaryItem,
} from './flowSelection'
