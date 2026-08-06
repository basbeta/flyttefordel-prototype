// CR-012: unit tests for uploadImage — mocks the S3 client, no real network call.
import { vi, describe, it, expect, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('./client', () => ({
  getS3Client: () => ({ send: sendMock }),
  getS3Config: () => ({
    endpoint: 'https://fsn1.your-objectstorage.com',
    region: 'fsn1',
    bucket: 'basbeta-pub-object-storage',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  }),
}))

import { uploadImage } from './uploadImage'

beforeEach(() => {
  sendMock.mockReset()
  sendMock.mockResolvedValue({})
})

describe('uploadImage', () => {
  it('uploads the buffer once and returns a path-style public URL', async () => {
    const result = await uploadImage(Buffer.from('fake image bytes'), 'image/jpeg')

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(result.url).toMatch(
      /^https:\/\/fsn1\.your-objectstorage\.com\/basbeta-pub-object-storage\/[0-9a-f-]+\.jpg$/
    )
  })

  it('uses the correct extension per content type', async () => {
    const png = await uploadImage(Buffer.from('a'), 'image/png')
    const webp = await uploadImage(Buffer.from('b'), 'image/webp')

    expect(png.url.endsWith('.png')).toBe(true)
    expect(webp.url.endsWith('.webp')).toBe(true)
  })

  it('generates a unique key for every upload', async () => {
    const first = await uploadImage(Buffer.from('a'), 'image/png')
    const second = await uploadImage(Buffer.from('a'), 'image/png')

    expect(first.url).not.toBe(second.url)
  })
})
