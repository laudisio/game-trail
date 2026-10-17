import { load, save } from './storage';

export const getName = () => load<string>('rastro.name', '');
export const setName = (n: string) => save('rastro.name', n.slice(0, 16));
