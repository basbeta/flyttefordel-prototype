// CR-012: Last opp et validert bilde til S3-kompatibel storage.

import { randomUUID } from 'crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, getS3Config } from './client'
import { extensionForContentType, type DetectedImageType } from './validateImage'

export type UploadImageResult = { url: string }

export async function uploadImage(buffer: Buffer, contentType: DetectedImageType): Promise<UploadImageResult> {
  const config = getS3Config()
  if (!config) {
    throw new Error('S3 storage er ikke konfigurert')
  }

  const key = `${randomUUID()}.${extensionForContentType(contentType)}`

  // Ingen ACL satt her — bucketen (basbeta-pub-object-storage) er satt til
  // "Public (read-only)" på bucket-nivå i Hetzner Object Storage. Se
  // change-requests/CR-012-image-upload.md.
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  return { url: `${config.endpoint}/${config.bucket}/${key}` }
}
