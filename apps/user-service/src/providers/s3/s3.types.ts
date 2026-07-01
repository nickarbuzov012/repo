import type { Readable } from 'node:stream';

export interface UploadObjectInput {
  key: string;
  body: Buffer | Uint8Array | Readable;
  contentType: string;
  contentLength?: number;
}
