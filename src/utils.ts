export const mapSeries = <T, U>(items: T[], func: (item: T) => Promise<U>) => (items || []).reduce(
  (lastPromise, item) => lastPromise.then(async (results: U[]) => [...results, await func(item)]),
  Promise.resolve([] as U[]));

export const mergeSet = <T>(...arrays: T[][]) => Array.from(new Set([...arrays.flat()]));

export const pick = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

export const pickOut = <T>(array: T[]) => array.splice(Math.floor(Math.random() * array.length), 1)
  .pop();

export const random = ({ min = 0, max = 1 }: { min?: number, max?: number } = {}): number => (
  (Math.random() * (max - min)) + min);

export const range = (length: number) => [...Array(length).keys()];

export const shuffle = <T>(array: T[]) => {
  const remaining = [...array];
  const shuffled = [];
  while (remaining.length) {
    shuffled.push(pickOut(remaining) as T);
  }
  return shuffled;
};

export const pickOutMultiple = <T>(array: T[], count: number) => range(count)
  .map(() => pickOut(array))
  .filter(Boolean) as T[];
