import { Directory, File, Paths } from 'expo-file-system';
import { fetch } from 'expo/fetch';

export async function downloadFile(
  url: string,
  destinationDir: Directory,
  filename?: string
): Promise<File> {
  console.log(`⬇️  Downloading: ${url}`);
  try {
    destinationDir.create();
  } catch {
    // exists
  }
  // If no filename provided, let File.downloadFileAsync derive it from URL.
  let outFile: File;
  if (filename) {
    outFile = new File(destinationDir, filename);
    outFile.create();
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`   ✗ Download failed: HTTP ${response.status}`);
      throw new Error(`Download failed: HTTP ${response.status}`);
    }
    outFile.write(await response.bytes());
  } else {
    const output = await File.downloadFileAsync(url, destinationDir);
    // output is a File instance per docs (has exists & uri)
    outFile = output as File;
  }
  console.log(`   ✓ Downloaded successfully (${outFile.uri})`);
  return outFile;
}

/**
 * Validate image file existence using File objects.
 * Assumes URIs reside under document or cache paths.
 */
export function validateFilesExist(uris: string[]): string[] {
  if (uris.length === 0) return [];
  const valid: string[] = [];
  console.log(`Validating ${uris.length} image files...`);
  for (const uri of uris) {
    try {
      const name = uri.split('/').pop() || 'unknown';
      // Simple heuristic: default to cache root; adjust logic if you maintain structured URIs.
      const parent = new Directory(Paths.cache);
      const f = new File(parent, name);
      if ((f as any).exists ?? false) {
        valid.push(uri);
      } else {
        console.warn(`  ✗ File missing: ${uri}`);
      }
    } catch (error) {
      console.warn(`  ✗ Validation error: ${uri}`, error);
    }
  }
  const skipped = uris.length - valid.length;
  if (skipped > 0) console.log(`  ${valid.length} valid, ${skipped} skipped`);
  return valid;
}
