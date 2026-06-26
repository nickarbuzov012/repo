export interface UploadObjectInput {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}
