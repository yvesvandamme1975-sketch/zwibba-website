import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

import { loadEnv } from '../config/env';

@Injectable()
export class R2StorageService {
  private readonly env = loadEnv();
  private readonly s3Client = new S3Client({
    credentials: {
      accessKeyId: this.env.r2.accessKeyId,
      secretAccessKey: this.env.r2.secretAccessKey,
    },
    endpoint: this.env.r2.s3Endpoint,
    region: 'auto',
  });

  async createPresignedUpload({
    contentType,
    objectKey,
  }: {
    contentType: string;
    objectKey: string;
  }) {
    const uploadUrl = await getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: this.env.r2.bucket,
        ContentType: contentType,
        Key: objectKey,
      }),
      {
        expiresIn: 300,
      },
    );

    return {
      objectKey,
      publicUrl: `${this.env.r2.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`,
      uploadUrl,
    };
  }

  async deleteObject(objectKey: string) {
    if (!objectKey) {
      return;
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.env.r2.bucket,
        Key: objectKey,
      }),
    );
  }
}
