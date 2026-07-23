/**
 * Compresor de imágenes cliente para optimizar fotos tomadas desde celulares
 * antes de transmitirlas por red móvil.
 */
export async function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) {
  if (!file || !(file instanceof Blob)) return file;
  
  // No comprimir si no es una imagen o si es un PDF / SVG / etc.
  const type = file.type || '';
  if (!type.startsWith('image/') && !/\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name || '')) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Si la imagen es más pequeña que el máximo, no reescalar dimensiones
    if (width <= maxWidth && height <= maxHeight && file.size < 500 * 1024) {
      bitmap.close();
      return file;
    }

    // Calcular nuevas dimensiones manteniendo la relación de aspecto
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Si el blob comprimido resulta mayor que el original, retornar el original
            resolve(file);
          } else {
            const fileName = (file.name || 'photo.jpg').replace(/\.[^/.]+$/, "") + '.jpg';
            const compressedFile = new File([blob], fileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch (err) {
    console.warn('No se pudo comprimir la imagen en el cliente, usando original:', err);
    return file;
  }
}
