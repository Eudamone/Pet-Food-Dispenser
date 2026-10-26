// storage.client.ts
// Almacenamiento genérico usado por los repositorios en memoria.

export interface StorageClient {
  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, value: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  list<T>(collection: string): Promise<T[]>;
}

export class InMemoryStorageClient implements StorageClient {
  private readonly collections = new Map<string, Map<string, unknown>>();

  async get<T>(collection: string, id: string): Promise<T | null> {
    return (this.bucket(collection).get(id) as T | undefined) ?? null;
  }

  async set<T>(collection: string, id: string, value: T): Promise<void> {
    this.bucket(collection).set(id, value);
  }

  async remove(collection: string, id: string): Promise<void> {
    this.bucket(collection).delete(id);
  }

  async list<T>(collection: string): Promise<T[]> {
    return [...this.bucket(collection).values()] as T[];
  }

  private bucket(collection: string): Map<string, unknown> {
    let bucket = this.collections.get(collection);
    if (!bucket) {
      bucket = new Map<string, unknown>();
      this.collections.set(collection, bucket);
    }
    return bucket;
  }
}
