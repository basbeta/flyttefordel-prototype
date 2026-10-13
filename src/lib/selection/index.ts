// CR-029: Public API for the selection module.
// The pure parts are exported here. loadSelectionExtras (I/O) is imported from './loadPerson'.

export { isQualified, explainSelection, daysBetweenUtc } from './isQualified'
export type {
  SelectionPerson,
  SelectionRule,
  SelectionCriterion,
  SelectionExplanation,
} from './types'
