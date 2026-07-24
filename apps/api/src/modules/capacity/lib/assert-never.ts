/** Exhaustivité TypeScript — branche `default` des switchs sur unions fermées. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
