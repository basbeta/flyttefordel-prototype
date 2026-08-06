// CR-012: Bildeopplasting — filvalidering.
// Sjekker faktiske magic bytes i filinnholdet, ikke bare klientens påstått
// Content-Type — en klient kan sette en hvilken som helst MIME-type på en
// vilkårlig fil.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export type DetectedImageType = 'image/jpeg' | 'image/png' | 'image/webp'

function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buffer.length >= pngSignature.length && pngSignature.every((b, i) => buffer[i] === b)) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export type ImageValidationResult =
  | { valid: true; contentType: DetectedImageType }
  | { valid: false; error: string }

export function validateImage(buffer: Buffer): ImageValidationResult {
  if (buffer.length === 0) {
    return { valid: false, error: 'Filen er tom' }
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'Filen er større enn 5 MB' }
  }
  const contentType = detectImageType(buffer)
  if (!contentType) {
    return { valid: false, error: 'Ukjent eller ikke-tillatt filtype — kun JPG, PNG og WebP er tillatt' }
  }
  return { valid: true, contentType }
}

export function extensionForContentType(contentType: DetectedImageType): string {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
  }
}
