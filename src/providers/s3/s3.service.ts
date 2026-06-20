import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { S3_CLIENT } from './s3.constants';
import type { UploadObjectInput } from './s3.types';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketName: string;
  private bucketInitialization: Promise<void> | undefined;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    configService: ConfigService,
  ) {
    this.bucketName = configService.getOrThrow<string>('MINIO_BUCKET');
  }

  async uploadObject(input: UploadObjectInput): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    this.logger.log(`Uploaded object: bucket=${this.bucketName} key=${input.key}`);
  }

  async deleteObject(key: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    this.logger.log(`Deleted object: bucket=${this.bucketName} key=${key}`);
  }

  createObjectKey(prefix: string, extension: string): string {
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
    const normalizedExtension = extension.replace(/^\./, '').toLowerCase();

    if (!normalizedPrefix || !/^[a-z0-9]+$/i.test(normalizedExtension)) {
      throw new Error('Invalid object key prefix or extension');
    }

    return `${normalizedPrefix}/${randomUUID()}.${normalizedExtension}`;
  }

  private ensureBucket(): Promise<void> {
    this.bucketInitialization ??= this.initializeBucket().catch((error) => {
      this.bucketInitialization = undefined;
      throw error;
    });

    return this.bucketInitialization;
  }

  private async initializeBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return;
    } catch (error: unknown) {
      if (!this.isMissingBucket(error)) {
        this.logger.error(`Failed to inspect bucket: ${this.bucketName}`);
        throw error;
      }
    }

    await this.client.send(
      new CreateBucketCommand({ Bucket: this.bucketName }),
    );
    this.logger.log(`Created bucket: ${this.bucketName}`);
  }

  private isMissingBucket(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };

    return (
      candidate.name === 'NotFound' ||
      candidate.name === 'NoSuchBucket' ||
      candidate.$metadata?.httpStatusCode === 404
    );
  }
}
