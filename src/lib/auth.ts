/**
 * Password auth using the browser/Tauri Web Crypto API (PBKDF2-HMAC-SHA-256).
 *
 * Hash is stored in app_settings table (not localStorage) so it lives with the
 * database — restoring a backup also restores the password. Combined with
 * BitLocker on disk, this is "good enough" for a single-user CRM.
 *
 * NOTE: This is NOT data-at-rest encryption. The DB file is still plain SQLite
 * — the lock is at the UI layer only. For real encryption use SQLCipher.
 */
import { getSetting, setSetting, SETTINGS_KEYS } from "./settings";

const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2) throw new Error("Invalid hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

async function deriveHash(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** True if a password has ever been set on this database. */
export async function hasPasswordSet(): Promise<boolean> {
  const h = await getSetting(SETTINGS_KEYS.PASSWORD_HASH);
  return !!h;
}

/** First-run setup: store a new password. Overwrites any existing hash. */
export async function setPassword(password: string): Promise<void> {
  if (password.length < 6) {
    throw new Error("Hasło musi mieć co najmniej 6 znaków.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveHash(password, salt);
  await setSetting(SETTINGS_KEYS.PASSWORD_SALT, bytesToHex(salt));
  await setSetting(SETTINGS_KEYS.PASSWORD_HASH, bytesToHex(hash));
}

/** Constant-time verify of a candidate password against the stored hash. */
export async function verifyPassword(candidate: string): Promise<boolean> {
  const storedHashHex = await getSetting(SETTINGS_KEYS.PASSWORD_HASH);
  const storedSaltHex = await getSetting(SETTINGS_KEYS.PASSWORD_SALT);
  if (!storedHashHex || !storedSaltHex) return false;

  const salt = hexToBytes(storedSaltHex);
  const candidateHash = await deriveHash(candidate, salt);
  const storedHash = hexToBytes(storedHashHex);

  if (candidateHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < storedHash.length; i++) {
    diff |= candidateHash[i] ^ storedHash[i];
  }
  return diff === 0;
}

/** Change password — requires verification of the current one first. */
export async function changePassword(
  current: string,
  next: string,
): Promise<void> {
  if (!(await verifyPassword(current))) {
    throw new Error("Aktualne hasło niepoprawne.");
  }
  await setPassword(next);
}
