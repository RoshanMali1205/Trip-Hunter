/** Client-side avatar prep: accept large phone photos, shrink before upload. */

/** Raw pick limit — phone camera shots are often 3–12 MB. */
export const AVATAR_PICK_MAX_BYTES = 15 * 1024 * 1024;

/** After resize/compress we keep uploads small for Storage + localStorage. */
export const AVATAR_UPLOAD_MAX_EDGE = 1280;
export const AVATAR_JPEG_QUALITY = 0.82;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

export function validateAvatarFile(file: File): string | null {
  if (!file || file.size <= 0) {
    return 'Choose a photo to upload.';
  }
  if (file.size > AVATAR_PICK_MAX_BYTES) {
    return 'Photo must be 15 MB or smaller.';
  }
  if (!isLikelyImageFile(file)) {
    return 'Photo must be an image (JPG, PNG, WebP, HEIC, etc.).';
  }
  return null;
}

export function isLikelyImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  if (ALLOWED_MIME.has(mime)) return true;
  // Some mobile browsers omit MIME — fall back to extension.
  return /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name || '');
}

/**
 * Decode + resize + re-encode as JPEG so Storage always gets a consistent,
 * reasonably sized file (fixes 2 MB rejections and upsert path mismatches).
 */
export async function prepareAvatarFile(file: File): Promise<File> {
  const validation = validateAvatarFile(file);
  if (validation) throw new Error(validation);

  try {
    const bitmap = await loadImageSource(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, AVATAR_UPLOAD_MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process photo in this browser.');
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);
    if ('close' in bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }

    const blob = await canvasToJpegBlob(canvas, AVATAR_JPEG_QUALITY);
    return new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
      throw new Error(
        'This HEIC photo can’t be converted here. In iPhone Settings → Camera → Formats, choose Most Compatible, or export as JPG and try again.',
      );
    }
    if (message) throw err instanceof Error ? err : new Error(message);
    throw new Error('Could not read that photo. Try a JPG or PNG.');
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo'));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, body] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header ?? '')?.[1] ?? 'image/jpeg';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function loadImageSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to <img> decode (some formats / browsers).
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode photo'));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not compress photo'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}
