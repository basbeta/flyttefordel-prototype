// CR-024: public surface of the orders module.
export {
  CONSENT_PLACEHOLDER_NOTICE,
  CONSENT_TEXTS,
  buildConsentSnapshot,
  type ConsentTexts,
} from './consentTexts'
export { MAX_ORDER_LINES, OrderInputSchema, type OrderInput } from './orderSchema'
export {
  validateOrderLines,
  type InvalidLine,
  type InvalidReason,
  type LineValidation,
  type OrderLineInput,
  type ResolvedLine,
} from './validateLines'
export { buildLeadFormData, LEAD_CONSENT_TEXT, type LeadFormData } from './buildLeadData'
export {
  InvalidOrderLinesError,
  submitOrder,
  type SubmitOrderContext,
  type SubmitOrderResult,
} from './submitOrder'
