// CR-012: unit tests for S3 config resolution and lazy client construction.
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getS3Config, getS3Client } from './client'

const ENV_KEYS = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const
let originalEnv: Record<string, string | undefined>

beforeEach(() => {
  originalEnv = {}
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key]
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

describe('getS3Config', () => {
  it('returns null when any required env var is missing', () => {
    for (const key of ENV_KEYS) delete process.env[key]
    process.env.S3_ENDPOINT = 'https://fsn1.your-objectstorage.com'
    // S3_REGION etc. intentionally left unset
    expect(getS3Config()).toBeNull()
  })

  it('returns the full config when all env vars are set', () => {
    process.env.S3_ENDPOINT = 'https://fsn1.your-objectstorage.com'
    process.env.S3_REGION = 'fsn1'
    process.env.S3_BUCKET = 'basbeta-pub-object-storage'
    process.env.S3_ACCESS_KEY_ID = 'key'
    process.env.S3_SECRET_ACCESS_KEY = 'secret'

    expect(getS3Config()).toEqual({
      endpoint: 'https://fsn1.your-objectstorage.com',
      region: 'fsn1',
      bucket: 'basbeta-pub-object-storage',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    })
  })
})

describe('getS3Client', () => {
  it('throws a clear error instead of constructing a client when not configured', () => {
    for (const key of ENV_KEYS) delete process.env[key]
    expect(() => getS3Client()).toThrow(/S3.*ikke konfigurert/i)
  })
})
