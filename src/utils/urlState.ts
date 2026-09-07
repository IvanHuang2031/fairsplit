import LZString from 'lz-string';
import { BillState } from '../types';

/**
 * Encode bill state into a compressed, URL-safe string
 */
export function encodeBillState(bill: BillState): string {
  try {
    const json = JSON.stringify(bill);
    return LZString.compressToEncodedURIComponent(json);
  } catch (err) {
    console.error('Failed to encode bill state:', err);
    return '';
  }
}

/**
 * Decode compressed string back to bill state
 */
export function decodeBillState(encoded: string): BillState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.expenses)) {
      return parsed as BillState;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode bill state:', err);
    return null;
  }
}

/**
 * Generate a full shareable URL containing the current bill data
 */
export function generateShareUrl(bill: BillState): string {
  const base = window.location.origin + window.location.pathname;
  const encoded = encodeBillState(bill);
  return `${base}#data=${encoded}`;
}

/**
 * Generate a live room shareable URL
 */
export function generateRoomUrl(roomId: string): string {
  let base = window.location.origin + window.location.pathname;
  // If running on local dev server, point QR code to the public production URL so phones can open it directly
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    base = 'https://ivanhuang2031.github.io/fairsplit/';
  }
  return `${base}#room=${encodeURIComponent(roomId)}`;
}

/**
 * Parse the current URL hash to see if it carries room or data
 */
export function parseHash(hash: string): { type: 'data'; bill: BillState } | { type: 'room'; roomId: string } | null {
  if (!hash || hash.length <= 1) return null;
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  
  if (clean.startsWith('room=')) {
    const roomId = decodeURIComponent(clean.slice(5));
    if (roomId) return { type: 'room', roomId };
  }
  
  if (clean.startsWith('data=')) {
    const dataStr = clean.slice(5);
    const bill = decodeBillState(dataStr);
    if (bill) return { type: 'data', bill };
  }
  
  return null;
}
