// Utilities for generating Time-based One-Time Passwords (TOTP)
// Implements RFC 6238 and RFC 4648 (Base32)

const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32ToBuffer(str: string): Uint8Array {
  let cleanStr = str.toUpperCase().replace(/=+$/, "");
  // Remove spaces if any
  cleanStr = cleanStr.replace(/\s/g, ''); 
  
  let buffer = new Uint8Array((cleanStr.length * 5) / 8 | 0);
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < cleanStr.length; i++) {
    let idx = base32Chars.indexOf(cleanStr[i]);
    if (idx === -1) continue; // Skip invalid chars

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buffer;
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(signature);
}

export async function generateTOTP(secret: string, windowSeconds = 30): Promise<string> {
  try {
    const keyBytes = base32ToBuffer(secret);
    if (keyBytes.length === 0) return "INVALID";

    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / windowSeconds);

    // Convert time to 8-byte big-endian buffer
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    
    // Javascript bitwise operations are 32-bit.
    // Since we don't expect 'time' to exceed 32 bits (until year 2106), we write 0 to high 4 bytes.
    view.setUint32(0, 0, false); 
    view.setUint32(4, time, false);

    const hmac = await hmacSha1(keyBytes, new Uint8Array(buffer));

    // Truncate
    const offset = hmac[hmac.length - 1] & 0xf;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  } catch (e) {
    console.error("TOTP Generation Error:", e);
    return "ERROR";
  }
}

export function getTimeRemaining(windowSeconds = 30): number {
  const epoch = Math.round(new Date().getTime() / 1000.0);
  return windowSeconds - (epoch % windowSeconds);
}

export function isValidBase32(str: string): boolean {
  if (!str) return false;
  const regex = /^[A-Z2-7]+=*$/i;
  // Basic sanity check, removing spaces
  return regex.test(str.replace(/\s/g, ''));
}