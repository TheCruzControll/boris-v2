export function removeNil<T>(arr: Array<null | undefined | T>): T[] {
  return arr.filter((x): x is T => x !== null);
}
