import { range } from './utils';


const randomChannelValue = (min: number) => Math.round(Math.random() * (255 - min)) + min;

export function generateColor() {
  const zc = Math.floor(Math.random() * 3);
  return '#' + range(3)
    // One RGB channel can be from 0-255, the others from 64-255.
    .map(c => randomChannelValue(c === zc ? 0 : 64).toString(16).padStart(2, '0'))
    .join('')
};
