import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './s3.constants';
import { S3Service } from './s3.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): S3Client =>
        new S3Client({
          endpoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
          region: configService.get<string>('MINIO_REGION', 'us-east-1'),
          forcePathStyle: true,
          credentials: {
            accessKeyId:
              configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
            secretAccessKey:
              configService.getOrThrow<string>('MINIO_SECRET_KEY'),
          },
        }),
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
