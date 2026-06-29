import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

type HashMode = 'sync' | 'worker';

type HashJob = {
  id: number;
  algorithm: string;
  buffer: Buffer;
  resolve: (hash: string) => void;
  reject: (error: Error) => void;
};

type WorkerSlot = {
  worker: Worker;
  busy: boolean;
};

type WorkerMessage = {
  id: number;
  hash?: string;
  error?: string;
};

const workerSource = `
  const { createHash } = require('node:crypto');
  const { parentPort } = require('node:worker_threads');

  parentPort.on('message', ({ id, algorithm, buffer }) => {
    try {
      const hash = createHash(algorithm).update(Buffer.from(buffer)).digest('hex');
      parentPort.postMessage({ id, hash });
    } catch (error) {
      parentPort.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
`;

@Injectable()
export class FileHashService implements OnApplicationShutdown {
  private readonly logger = new Logger(FileHashService.name);
  private readonly mode: HashMode;
  private readonly workerCount: number;
  private readonly workers: WorkerSlot[] = [];
  private readonly queue: HashJob[] = [];
  private readonly jobs = new Map<number, HashJob & { worker: WorkerSlot }>();
  private nextJobId = 1;

  constructor(configService: ConfigService) {
    this.mode = configService.get<HashMode>('UPLOAD_HASH_MODE', 'sync');
    this.workerCount = Number(
      configService.get<string>(
        'UPLOAD_HASH_WORKERS',
        String(Math.min(4, availableParallelism())),
      ),
    );

    if (this.mode === 'worker') {
      for (let index = 0; index < this.workerCount; index += 1) {
        this.workers.push(this.createWorkerSlot(index));
      }

      this.logger.log(`File hashing mode=worker workers=${this.workerCount}`);
      return;
    }

    this.logger.log('File hashing mode=sync');
  }

  async hash(algorithm: string, buffer: Buffer): Promise<string> {
    if (this.mode === 'sync') {
      return createHash(algorithm).update(buffer).digest('hex');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: this.nextJobId,
        algorithm,
        buffer,
        resolve,
        reject,
      });
      this.nextJobId += 1;
      this.drainQueue();
    });
  }

  async hashFile(algorithm: string, filePath: string): Promise<string> {
    const hash = createHash(algorithm);

    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .on('data', (chunk) => {
          hash.update(chunk);
        })
        .on('error', reject)
        .on('end', () => {
          resolve(hash.digest('hex'));
        });
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(
      this.workers.map(({ worker }) => worker.terminate()),
    );
  }

  private createWorkerSlot(index: number): WorkerSlot {
    const slot: WorkerSlot = {
      worker: new Worker(workerSource, { eval: true }),
      busy: false,
    };

    slot.worker.on('message', (message: WorkerMessage) => {
      this.completeWorkerJob(slot, message);
    });
    slot.worker.on('error', (error) => {
      this.failWorker(slot, error);
    });
    slot.worker.on('exit', (code) => {
      if (code !== 0) {
        this.failWorker(slot, new Error(`Hash worker exited: code=${code}`));
      }

      const slotIndex = this.workers.indexOf(slot);
      if (slotIndex >= 0) {
        this.workers[slotIndex] = this.createWorkerSlot(index);
        this.drainQueue();
      }
    });

    return slot;
  }

  private drainQueue(): void {
    for (const slot of this.workers) {
      if (slot.busy) {
        continue;
      }

      const job = this.queue.shift();
      if (!job) {
        return;
      }

      slot.busy = true;
      this.jobs.set(job.id, { ...job, worker: slot });
      slot.worker.postMessage({
        id: job.id,
        algorithm: job.algorithm,
        buffer: job.buffer,
      });
    }
  }

  private completeWorkerJob(slot: WorkerSlot, message: WorkerMessage): void {
    const job = this.jobs.get(message.id);
    if (!job) {
      return;
    }

    this.jobs.delete(message.id);
    slot.busy = false;

    if (message.error) {
      job.reject(new Error(message.error));
    } else if (message.hash) {
      job.resolve(message.hash);
    } else {
      job.reject(new Error('Hash worker returned empty result'));
    }

    this.drainQueue();
  }

  private failWorker(slot: WorkerSlot, error: Error): void {
    for (const [id, job] of this.jobs.entries()) {
      if (job.worker === slot) {
        this.jobs.delete(id);
        job.reject(error);
      }
    }

    slot.busy = false;
    this.logger.error(error.message, error.stack);
  }
}
