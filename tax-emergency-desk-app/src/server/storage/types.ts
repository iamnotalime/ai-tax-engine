export type StoredObjectInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};

export type StorageAdapter = {
  readonly driver: 'local' | 's3';
  putObject(input: StoredObjectInput): Promise<void>;
  deleteObject(key: string): Promise<void>;
};
