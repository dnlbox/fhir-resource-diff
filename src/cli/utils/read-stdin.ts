/**
 * Reads all of stdin and returns it as a UTF-8 string.
 * Throws if stdin is a TTY (no piped input).
 *
 * Uses an async stream approach instead of readFileSync(0) because Node.js ESM
 * puts stdin in non-blocking mode at startup. readFileSync(0) throws EAGAIN when
 * the pipe source (e.g. curl) hasn't written data yet, even though data is coming.
 */
export function readStdinSync(): Promise<string> {
  if (process.stdin.isTTY) {
    return Promise.reject(new Error("No input on stdin (stdin is a TTY)"));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}
