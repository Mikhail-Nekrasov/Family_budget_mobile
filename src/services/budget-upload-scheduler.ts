export type BudgetUploadResult = 'complete' | 'more' | 'blocked';

const CHANGE_DELAY_MS = 250;
const FIRST_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;

/** Keep one batch in flight and retry only while the device is available. */
export function createBudgetUploadScheduler(
  run: () => Promise<BudgetUploadResult>,
  shouldRetry: (error: unknown) => boolean,
) {
  let available = false;
  let running = false;
  let requested = false;
  let stopped = false;
  let disposed = false;
  let retryDelay = FIRST_RETRY_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(delay: number) {
    if (!available || stopped || running || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void tick();
    }, delay);
  }

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  async function tick() {
    if (!available || stopped || running) return;
    running = true;
    requested = false;
    let nextDelay: number | undefined;
    try {
      const result = await run();
      retryDelay = FIRST_RETRY_MS;
      if (result === 'blocked') stopped = true;
      if (result === 'more' || requested) nextDelay = CHANGE_DELAY_MS;
    } catch (error) {
      if (shouldRetry(error)) {
        nextDelay = retryDelay;
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
      } else {
        stopped = true;
      }
    } finally {
      running = false;
      if (nextDelay !== undefined) schedule(nextDelay);
    }
  }

  return {
    setAvailable(next: boolean) {
      if (available === next || disposed) return;
      available = next;
      if (available) {
        requested = true;
        schedule(CHANGE_DELAY_MS);
      } else {
        clearTimer();
      }
    },
    wake() {
      if (stopped) return;
      requested = true;
      schedule(CHANGE_DELAY_MS);
    },
    resume() {
      if (disposed || !stopped) return;
      stopped = false;
      requested = true;
      schedule(CHANGE_DELAY_MS);
    },
    dispose() {
      disposed = true;
      stopped = true;
      clearTimer();
    },
  };
}
