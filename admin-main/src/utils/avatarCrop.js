const AVATAR_SIZE = 512;

function createImage(imageSrc) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = imageSrc;
  });
}

export async function getCroppedImageDataUrl(imageSrc, cropPixels, size = AVATAR_SIZE, quality = 0.82) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL('image/jpeg', quality);
}

export async function getCroppedAvatarDataUrl(imageSrc, cropPixels) {
  return getCroppedImageDataUrl(imageSrc, cropPixels, AVATAR_SIZE, 0.82);
}
