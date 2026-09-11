import { level1 } from './levels/level1';
import { level2 } from './levels/level2';
import { level3 } from './levels/level3';
import { level4 } from './levels/level4';
import type { LevelDef } from './types';

export const levels: LevelDef[] = [level1, level2, level3, level4];

export function getLevel(id: number): LevelDef | undefined {
  return levels.find((l) => l.id === id);
}
