/** Keeps the screen on while practicing. Returns a release function; no-op when unsupported. */
export async function acquireWakeLock(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => {});
  } catch {
    return () => {};
  }
}
