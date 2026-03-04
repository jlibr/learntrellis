/**
 * AES-256-GCM Encryption/Decryption
 *
 * Uses Web Crypto API for Edge runtime compatibility.
 * ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes).
 *
 * SECURITY:
 * - Never log plaintext or keys
 * - Never include key material in error messages
 * - Only call from server actions / API routes
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits, recommended for AES-GCM
const KEY_LENGTH = 256; // bits

/**
 * Get the app-level encryption key from the environment.
 * Returns a CryptoKey suitable for AES-256-GCM operations.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("Server configuration error");
  }

  if (keyHex.length !== 64) {
    throw new Error("Server configuration error");
  }

  const keyBytes = hexToBytes(keyHex);

  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string containing: IV (12 bytes) + ciphertext + auth tag.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bytesToBase64(combined);
}

/**
 * Decrypt a base64-encoded ciphertext string.
 * Expects the format produced by encrypt(): IV (12 bytes) + ciphertext + auth tag.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = base64ToBytes(encryptedBase64);

  if (combined.length < IV_LENGTH + 1) {
    throw new Error("Decryption failed");
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
