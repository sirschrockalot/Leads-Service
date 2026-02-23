import { LeadStatus } from '../schemas/lead.schema';

/**
 * PDR status codes from docs/imports/pdr_deals.csv (column B):
 * 0  = Leads terminated
 * 0b = DNC
 * 1  = Leads Cloud
 * 2  = Callbacks
 * 2a = Offer Made
 * 3  = Negotiating Offer
 * 3a = Contract Out
 * 6  = Transactions
 *
 * We normalize these into our LeadStatus enum for storage.
 */
const PDR_STATUS_CODES: Record<string, LeadStatus> = {
  '0': LeadStatus.DEAD, // Leads terminated
  '0b': LeadStatus.DEAD, // DNC -> treat as terminated/dead lead
  '1': LeadStatus.NEW, // Leads Cloud
  '2': LeadStatus.CALL_BACK, // Callbacks
  '2a': LeadStatus.OFFER_MADE, // Offer Made
  '3': LeadStatus.NEGOTIATING_OFFER, // Negotiating Offer
  '3a': LeadStatus.CONTRACT_OUT, // Contract Out
  '6': LeadStatus.TRANSACTION, // Transactions
};

const NUMERIC_STATUS: Record<number, LeadStatus> = {
  0: LeadStatus.NEW,
  1: LeadStatus.NEW,
  2: LeadStatus.CONTACTED,
  3: LeadStatus.APPT_SET,
  4: LeadStatus.OFFER_SENT,
  5: LeadStatus.UNDER_CONTRACT,
  6: LeadStatus.DEAD,
  7: LeadStatus.NURTURE,
  8: LeadStatus.FOLLOW_UP,
};

const STATUS_STRINGS: Record<string, LeadStatus> = {
  new: LeadStatus.NEW,
  contacted: LeadStatus.CONTACTED,
  appt_set: LeadStatus.APPT_SET,
  offer_sent: LeadStatus.OFFER_SENT,
  under_contract: LeadStatus.UNDER_CONTRACT,
  dead: LeadStatus.DEAD,
  nurture: LeadStatus.NURTURE,
  follow_up: LeadStatus.FOLLOW_UP,
  qualified: LeadStatus.QUALIFIED,
  converted: LeadStatus.CONVERTED,
  lost: LeadStatus.LOST,
};

export function mapImportStatus(raw: unknown): { status: LeadStatus; legacyStatus?: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { status: LeadStatus.NEW };
  }

  const rawStr = String(raw).trim();
  const codeKey = rawStr.toLowerCase();

  // First, handle the explicit PDR status codes from the CSV mapping
  if (PDR_STATUS_CODES[codeKey] !== undefined) {
    return { status: PDR_STATUS_CODES[codeKey], legacyStatus: rawStr };
  }

  // Backwards-compatible numeric mapping for other sources
  const num = typeof raw === 'number' ? raw : parseInt(rawStr, 10);
  if (!Number.isNaN(num) && NUMERIC_STATUS[num] !== undefined) {
    return { status: NUMERIC_STATUS[num] };
  }

  // Direct enum value (e.g. CALL_BACK, OFFER_MADE)
  const upper = rawStr.toUpperCase().replace(/\s+/g, '_');
  if (Object.values(LeadStatus).includes(upper as LeadStatus)) {
    return { status: upper as LeadStatus };
  }

  // String aliases like "new", "contacted", etc.
  const lower = rawStr.toLowerCase().replace(/\s+/g, '_');
  if (STATUS_STRINGS[lower] !== undefined) {
    return { status: STATUS_STRINGS[lower] };
  }

  // Unknown status: store as NEW but keep legacyStatus so we can inspect later
  return { status: LeadStatus.NEW, legacyStatus: rawStr };
}
