/**
 * Frontend Crypto — matches PHP EncryptionService exactly
 *
 * Private key storage:  PBKDF2-SHA256 (100k iter, 32-byte salt) → AES-256-CBC
 * Data envelope:        ENC:: + base64(JSON{ ek: RSA-OAEP(DEK), iv: hex, ct: AES-256-CBC(plaintext) })
 */

// ── Helpers ──────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [\w\s]+-----/g, '')
    .replace(/-----END [\w\s]+-----/g, '')
    .replace(/\s/g, '');
  return b64ToBytes(b64).buffer as ArrayBuffer;
}

// ── Unlock Private Key ───────────────────────────────────
// Matches PHP: hash_pbkdf2('sha256', passphrase, salt, 100000, 32, raw) → AES-256-CBC

export async function unlockPrivateKey(
  encryptedPrivateKeyB64: string,
  saltHex: string,
  ivHex: string,
  passphrase: string
): Promise<string> {
  const salt = hexToBytes(saltHex);
  const iv = hexToBytes(ivHex);
  const encryptedBytes = b64ToBytes(encryptedPrivateKeyB64);

  // 1. Derive AES-256 key from passphrase using PBKDF2
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt']
  );

  // 2. Decrypt the private key PEM string
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
    aesKey,
    encryptedBytes.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

// ── Decrypt Envelope ─────────────────────────────────────
// Matches PHP: ENC:: + base64(json({v, ek, iv, ct}))
//   ek = RSA-OAEP encrypted DEK (base64)
//   iv = AES IV (hex)
//   ct = AES-256-CBC ciphertext (base64)

export function isEncryptedValue(value: string): boolean {
  return value.startsWith('ENC::');
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const der = pemToArrayBuffer(pem);
  return await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-1' },
    false, // extractable: false — CANNOT be exported back to string/bytes
    ['decrypt']
  );
}

export async function decryptEnvelope(
  encryptedPayload: string,
  rsaKey: CryptoKey // Takes the pre-imported key
): Promise<string> {
  if (!encryptedPayload.startsWith('ENC::')) {
    return encryptedPayload; // not encrypted
  }

  // 1. Parse envelope
  const envelopeJson = atob(encryptedPayload.substring(5));
  const envelope = JSON.parse(envelopeJson);

  if (!envelope.ek || !envelope.iv || !envelope.ct) {
    throw new Error('Invalid encryption envelope');
  }

  const encryptedDek = b64ToBytes(envelope.ek);
  const iv = hexToBytes(envelope.iv);
  const ciphertext = b64ToBytes(envelope.ct);

  // 2. RSA key is already provided as CryptoKey

  // 3. Decrypt DEK using RSA-OAEP
  const dek = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaKey,
    encryptedDek.buffer as ArrayBuffer
  );

  // 4. Import DEK as AES-CBC key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    dek,
    { name: 'AES-CBC', length: 256 },
    false,
    ['decrypt']
  );

  // 5. Decrypt ciphertext
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
    aesKey,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(plaintext);
}
