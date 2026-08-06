// CR-012: unit tests for magic-byte image validation.
import { describe, expect, it } from 'vitest'
import { validateImage, MAX_IMAGE_BYTES } from './validateImage'

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0]
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function webpBuffer(size = 20): Buffer {
  const buf = Buffer.alloc(size)
  buf.write('RIFF', 0, 'ascii')
  buf.write('WEBP', 8, 'ascii')
  return buf
}

describe('validateImage', () => {
  it('accepts a valid JPEG', () => {
    const result = validateImage(Buffer.from([...JPEG_HEADER, 0, 0, 0]))
    expect(result).toEqual({ valid: true, contentType: 'image/jpeg' })
  })

  it('accepts a valid PNG', () => {
    const result = validateImage(Buffer.from([...PNG_HEADER, 0, 0]))
    expect(result).toEqual({ valid: true, contentType: 'image/png' })
  })

  it('accepts a valid WebP', () => {
    const result = validateImage(webpBuffer())
    expect(result).toEqual({ valid: true, contentType: 'image/webp' })
  })

  it('rejects an empty file', () => {
    expect(validateImage(Buffer.alloc(0))).toEqual({ valid: false, error: 'Filen er tom' })
  })

  it('rejects a file over the 5 MB limit', () => {
    const oversized = Buffer.concat([Buffer.from(JPEG_HEADER), Buffer.alloc(MAX_IMAGE_BYTES)])
    const result = validateImage(oversized)
    expect(result.valid).toBe(false)
  })

  it('rejects a file with no recognized image signature', () => {
    const result = validateImage(Buffer.from([0x00, 0x01, 0x02, 0x03]))
    expect(result.valid).toBe(false)
  })

  it('rejects a text file even if it were mislabeled as an image by the client', () => {
    const result = validateImage(Buffer.from('this is plain text, not an image'))
    expect(result.valid).toBe(false)
  })
})
