/**
 * Mock for expo-crypto
 */

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA256',
} as const;

export async function digestStringAsync(algorithm: string, data: string): Promise<string> {
  // Simple deterministic hash for testing
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Return 64-char hex string (simulate SHA-256)
  return Math.abs(hash).toString(16).padStart(64, '0');
}
