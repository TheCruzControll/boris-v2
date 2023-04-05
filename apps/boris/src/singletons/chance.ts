import { Chance } from 'chance';

let chance: Chance.Chance;

export function getChance() {
  if (!chance) {
    chance = new Chance();
  }
  return chance;
}
