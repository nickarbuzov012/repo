declare module 'multer' {
  export function diskStorage(options: {
    destination:
      | string
      | ((
          request: unknown,
          file: { originalname: string },
          callback: (error: Error | null, destination: string) => void,
        ) => void);
    filename?: (
      request: unknown,
      file: { originalname: string },
      callback: (error: Error | null, filename: string) => void,
    ) => void;
  }): unknown;
}
