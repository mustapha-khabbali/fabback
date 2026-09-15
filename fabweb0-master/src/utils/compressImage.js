// iPhones save photos as HEIC, which browsers can neither display nor draw to a
// canvas — so we convert HEIC -> JPEG at high quality. Every other format
// (JPEG/PNG/WebP) is kept byte-for-byte to preserve FULL quality, because these
// images get reused later for the public blog. Only an absurdly large file gets
// a safety downscale so one photo can't overflow the sync payload.

const HEIC_JPEG_QUALITY = 0.92;         // high quality; HEIC has no lossless web form
const SAFETY_MAX_BYTES = 15 * 1024 * 1024; // leave anything smaller fully untouched
const SAFETY_MAX_DIMENSION = 3000;      // generous — only monster images shrink

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function isHeic(file) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name || '');
}

// Rough byte size of a base64 data URL without decoding it.
function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

// HEIC -> full-resolution high-quality JPEG. heic2any is loaded lazily so its
// wasm only ships to users who actually upload a HEIC.
async function heicToJpegDataUrl(file) {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: HEIC_JPEG_QUALITY });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return readBlobAsDataUrl(blob);
}

// Safety net for enormous images only: downscale as gently as possible.
async function safetyDownscale(dataUrl) {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, SAFETY_MAX_DIMENSION / Math.max(image.width, image.height));
  if (scale >= 1) return dataUrl; // dimensions already reasonable — keep untouched
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', HEIC_JPEG_QUALITY);
}

// Returns a web-displayable data URL, preserving full quality except for HEIC
// (converted to JPEG) and files above the safety ceiling. Throws on failure so
// the caller can tell the user instead of silently storing a broken image.
export async function compressImageFile(file) {
  let dataUrl = isHeic(file) ? await heicToJpegDataUrl(file) : await readBlobAsDataUrl(file);

  if (dataUrlBytes(dataUrl) > SAFETY_MAX_BYTES) {
    dataUrl = await safetyDownscale(dataUrl);
  }

  if (dataUrlBytes(dataUrl) < 1024) {
    throw new Error('image processing produced empty output');
  }
  return dataUrl;
}
