import { range } from './utils';


const randomChannelValue = (min: number) => Math.round(Math.random() * (255 - min)) + min;

// eslint-disable-next-line import/prefer-default-export
export function generateColor() {
  const zc = Math.floor(Math.random() * 3);
  return ['#',
    // One RGB channel can be from 0-255, the others from 64-255.
    ...range(3).map(c => randomChannelValue(c === zc ? 0 : 64).toString(16).padStart(2, '0')),
  ].join('');
}
