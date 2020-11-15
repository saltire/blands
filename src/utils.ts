export const mergeSet = <T>(...arrays: T[][]) => Array.from(new Set([...arrays.flat()]));

export const pick = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

export const pickOut = <T>(array: T[]) => array.splice(Math.floor(Math.random() * array.length), 1)
  .pop();

export const range = (length: number) => [...Array(length).keys()];

export const shuffle = <T>(array: T[]) => {
  const remaining = [...array];
  const shuffled = [];
  while (remaining.length) {
    shuffled.push(pickOut(remaining) as T);
  }
  return shuffled;
};
