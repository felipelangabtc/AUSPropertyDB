import { z } from 'zod';

/**
 * Address normalization for Australian properties
 * Handles variations and common formats
 */

export interface NormalizedAddress {
  street_number: string;
  street_name: string;
  street_type: string; // Street, Road, Avenue, etc.
  suburb: string;
  postcode: string;
  state: string;
  unit_number?: string; // Unit/Apt number
  unit_type?: string; // Unit, Apartment, Flat, etc.
  canonical: string; // Full standardized address
  fingerprint: string; // Hash for deduplication
}

// Australian states
const AU_STATES: Record<string, string> = {
  'new south wales': 'NSW',
  nsw: 'NSW',
  victoria: 'VIC',
  vic: 'VIC',
  queensland: 'QLD',
  qld: 'QLD',
  'south australia': 'SA',
  sa: 'SA',
  'western australia': 'WA',
  wa: 'WA',
  tasmania: 'TAS',
  tas: 'TAS',
  'australian capital territory': 'ACT',
  act: 'ACT',
  'northern territory': 'NT',
  nt: 'NT',
};

// Street types
const STREET_TYPES: Record<string, string> = {
  street: 'St',
  st: 'St',
  road: 'Rd',
  rd: 'Rd',
  avenue: 'Ave',
  ave: 'Ave',
  boulevard: 'Bvd',
  bvd: 'Bvd',
  circuit: 'Cct',
  cct: 'Cct',
  close: 'Cl',
  cl: 'Cl',
  court: 'Ct',
  ct: 'Ct',
  crescent: 'Cr',
  cr: 'Cr',
  drive: 'Dr',
  dr: 'Dr',
  lane: 'Ln',
  ln: 'Ln',
  parade: 'Pde',
  pde: 'Pde',
  plaza: 'Plz',
  plz: 'Plz',
  promenade: 'Prm',
  prm: 'Prm',
  square: 'Sq',
  sq: 'Sq',
  terrace: 'Ter',
  ter: 'Ter',
  way: 'Way',
  way: 'Way',
  alley: 'Alley',
  arc: 'Arc',
  arcade: 'Arcade',
  bend: 'Bend',
  bypass: 'Bypass',
  corner: 'Corner',
  cove: 'Cove',
  dale: 'Dale',
  driveway: 'Driveway',
  esplanade: 'Esp',
  fairway: 'Fairway',
  grove: 'Grove',
  heights: 'Heights',
  highway: 'Hwy',
  hwy: 'Hwy',
  hill: 'Hill',
  loop: 'Loop',
  mall: 'Mall',
  meander: 'Meander',
  mews: 'Mews',
  park: 'Park',
  parkway: 'Parkway',
  passage: 'Passage',
  path: 'Path',
  place: 'Pl',
  pl: 'Pl',
  range: 'Range',
  rise: 'Rise',
  row: 'Row',
  track: 'Track',
  trail: 'Trail',
  vale: 'Vale',
  view: 'View',
  vista: 'Vista',
  walk: 'Walk',
};

// Unit types
const UNIT_TYPES: Record<string, string> = {
  unit: 'Unit',
  apartment: 'Apt',
  apt: 'Apt',
  flat: 'Flat',
  fl: 'Flat',
  room: 'Room',
  rm: 'Room',
  level: 'Level',
  lvl: 'Level',
  suite: 'Suite',
  ste: 'Suite',
};

/**
 * Parse and normalize Australian address string
 */
export function parseAddress(addressString: string): Partial<NormalizedAddress> {
  const parts = addressString
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length < 2) {
    throw new Error('Invalid address format');
  }

  // Extract state and postcode from last part
  const lastPart = parts[parts.length - 1];
  let state = '';
  let postcode = '';

  const stateMatch = lastPart.match(/([A-Z]{2,3})/);
  if (stateMatch) {
    state = normalizeState(stateMatch[1]);
  }

  const postcodeMatch = lastPart.match(/\b(\d{4})\b/);
  if (postcodeMatch) {
    postcode = postcodeMatch[1];
  }

  // Extract suburb (usually part before state/postcode)
  const suburb = parts[parts.length - 2] || '';

  // Parse street address (first part)
  const streetPart = parts[0];
  const addressComponents = parseStreetAddress(streetPart);

  return {
    ...addressComponents,
    suburb: normalizeSuburb(suburb),
    postcode,
    state,
  };
}

/**
 * Parse street address into components
 */
function parseStreetAddress(streetString: string): Partial<NormalizedAddress> {
  const result: Partial<NormalizedAddress> = {};

  // Try to extract unit number (e.g., "Unit 5", "Apt 42", "5/10 Main St")
  const unitMatch = streetString.match(
    /^(?:(\d+)\/)?(?:(Unit|Apartment|Apt|Flat|Suite|Level|Rm)\s+)?(\d+)?/i
  );

  if (unitMatch) {
    if (unitMatch[1]) {
      result.unit_number = unitMatch[1];
    }
    if (unitMatch[2]) {
      result.unit_type = normalizeUnitType(unitMatch[2]);
    }
  }

  // Extract street number and name/type
  const streetMatch = streetString.match(
    /(\d+)\s+(.+?)\s+(St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Ln|Lane|Cr|Crescent|Ter|Terrace|Ct|Court|Cl|Close|Way|Hwy|Highway|Pl|Place|Bvd|Boulevard|Pde|Parade|Sq|Square|Cct|Circuit)(?:\s|$)/i
  );

  if (streetMatch) {
    result.street_number = streetMatch[1];
    result.street_name = normalizeStreetName(streetMatch[2]);
    result.street_type = normalizeStreetType(streetMatch[3]);
  }

  return result;
}

/**
 * Create canonical address string
 */
export function createCanonicalAddress(address: Partial<NormalizedAddress>): string {
  const parts: string[] = [];

  if (address.unit_number && address.unit_type) {
    parts.push(`${address.unit_type} ${address.unit_number}`);
  }

  if (address.street_number && address.street_name && address.street_type) {
    parts.push(`${address.street_number} ${address.street_name} ${address.street_type}`);
  }

  if (address.suburb) {
    parts.push(address.suburb);
  }

  if (address.postcode && address.state) {
    parts.push(`${address.state} ${address.postcode}`);
  }

  return parts.join(', ');
}

/**
 * Create fingerprint for deduplication (hash-like)
 * Uses normalized components for fuzzy matching
 */
export function createAddressFingerprint(address: Partial<NormalizedAddress>): string {
  const components = [
    address.street_number,
    normalizeStreetName(address.street_name || ''),
    address.suburb,
    address.postcode,
    address.state,
  ]
    .filter((c) => c && c.length > 0)
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, '');

  // Simple hash: first 20 chars normalized
  return components.substring(0, 50);
}

/**
 * Helper: Normalize state code
 */
function normalizeState(state: string): string {
  const normalized = AU_STATES[state.toLowerCase()];
  return normalized || state.toUpperCase();
}

/**
 * Helper: Normalize street type
 */
function normalizeStreetType(type: string): string {
  return STREET_TYPES[type.toLowerCase()] || type;
}

/**
 * Helper: Normalize street name (remove common suffixes, standardize)
 */
function normalizeStreetName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Normalize suburb name
 */
function normalizeSuburb(suburb: string): string {
  return suburb
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper: Normalize unit type
 */
function normalizeUnitType(type: string): string {
  return UNIT_TYPES[type.toLowerCase()] || type;
}

/**
 * Jaccard similarity between two sets of words (0-1)
 * Used for fuzzy matching addresses
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w))).size;
  const union = new Set([...words1, ...words2]).size;

  return union === 0 ? 1 : intersection / union;
}

/**
 * Levenshtein distance for string similarity (0-1)
 * Used for fuzzy matching
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const maxLength = Math.max(s1.length, s2.length);

  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance
 */
function levenshteinDistance(s1: string, s2: string): number {
  const dp: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    dp[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // substitution
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return dp[s1.length][s2.length];
}
