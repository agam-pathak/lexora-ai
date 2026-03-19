/**
 * In-process async mutex keyed by file path.
 * Prevents concurrent JSON read-write cycles from racing.
 */

type QueueEntry = {
  resolve: () => void;
};

const locks = new Map<string, QueueEntry[]>();

export async function withFileLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!locks.has(key)) {
    locks.set(key, []);
  }

  const queue = locks.get(key)!;

  if (queue.length > 0) {
    await new Promise<void>((resolve) => {
      queue.push({ resolve });
    });
  } else {
    queue.push({ resolve: () => {} });
  }

  try {
    return await operation();
  } finally {
    queue.shift();

    if (queue.length > 0) {
      queue[0].resolve();
    } else {
      locks.delete(key);
    }
  }
}
