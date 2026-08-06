// CR-012: S3-kompatibel klient for admin-opplastede bilder (Hetzner Object
// Storage — men kodet mot S3-APIet generelt, ikke leverandørspesifikt).
//
// MIGRATION NOTE: konstruksjonen er lazy (kun kjørt når getS3Client()/
// getS3Config() faktisk kalles), av samme grunn som src/lib/db/client.ts:
// Next.js evaluerer moduler under `next build` sin page-data-collection, og
// modulet må aldri kunne krasje bygget bare fordi env-variablene ikke er
// satt der.

import { S3Client } from '@aws-sdk/client-s3'

export type S3Config = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

export function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY_ID
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null
  }
  return { endpoint, region, bucket, accessKeyId, secretAccessKey }
}

let cachedClient: S3Client | null = null

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient

  const config = getS3Config()
  if (!config) {
    throw new Error(
      'S3 storage er ikke konfigurert — S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY må være satt'
    )
  }

  // forcePathStyle: Hetzner Object Storage (og de fleste S3-kompatible
  // leverandører uten wildcard-DNS for bucket-subdomener) bruker
  // https://<endpoint>/<bucket>/<key>, ikke virtual-hosted-style.
  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return cachedClient
}
