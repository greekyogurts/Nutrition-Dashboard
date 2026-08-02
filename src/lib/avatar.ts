/**
 * Turns a picked photo into a small square data URL for the header avatar.
 *
 * Phone camera photos run several megabytes; stored raw, a handful of profile
 * switches would meaningfully eat into the ~5–10MB `localStorage` quota this
 * app shares with the persisted query cache (see main.tsx). Resizing to a
 * fixed square client-side, before it ever touches storage, keeps one avatar
 * to a few tens of KB regardless of the source photo.
 *
 * Center-cropped to a square (`object-fit: cover` semantics) rather than
 * squashed, since the header renders it in a circle.
 */
export async function resizeImageToDataUrl(file: File, size = 128): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const sw = size / scale;
    const sh = size / scale;
    const sx = (bitmap.width - sw) / 2;
    const sy = (bitmap.height - sh) / 2;
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, size, size);

    // Browsers without WebP encoding (none left in this app's supported
    // range, but harmless to guard) silently return a PNG instead of
    // throwing — bigger, still correct.
    return canvas.toDataURL('image/webp', 0.85);
  } finally {
    bitmap.close();
  }
}
