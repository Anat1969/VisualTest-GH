// No accounts: a long random key identifies this user's data. Sharing the key = sharing the data.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function newSyncKey(): string {
  const bytes = new Uint8Array(28);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export const isValidSyncKey = (k: string) => /^[a-z0-9]{24,64}$/.test(k.trim());

/** Grouped for reading: xxxx-xxxx-... */
export const formatKey = (k: string) => k.match(/.{1,4}/g)?.join('-') ?? k;
export const parseKey = (k: string) => k.replace(/[^a-z0-9]/gi, '').toLowerCase();
