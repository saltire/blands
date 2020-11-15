export const mergeSet = <T>(...arrays: T[][]) => Array.from(new Set([...arrays.flat()]));

export const pick = <T>(array: T[]) => array[Math.floor(Math.random() * array.length)];

export const range = (length: number) => [...Array(length).keys()];
