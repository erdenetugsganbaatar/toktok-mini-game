import { createGrid } from './grid.ts';
import type { GridState } from './grid.ts';

export const ItemId = {
  Burger: 'burger',
  Pizza: 'pizza',
  BombFinder: 'bomb_finder',
} as const;

export type ItemIdValue = (typeof ItemId)[keyof typeof ItemId];

export type GamePhase = 'setup' | 'shuffling' | 'playing' | 'ended';

export const BOMB_FINDER_MAX_USES = 5;

interface PersistentState {
  gold: number;
  score: number;
  inventory: Record<ItemIdValue, number>;
  grid?: GridState;
  phase?: GamePhase;
}

const STORAGE_KEY = 'toktok_game_state';

function loadPersistentState(): PersistentState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as PersistentState;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return null;
}

function savePersistentState(state: GameState): void {
  try {
    const persistent: PersistentState = {
      gold: state.gold,
      score: state.score,
      inventory: state.inventory,
    };
    if (state.phase === 'playing') {
      persistent.grid = state.grid;
      persistent.phase = state.phase;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function saveState(state: GameState): void {
  savePersistentState(state);
}

export function clearSavedState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface GameState {
  gold: number;
  score: number;
  inventory: Record<ItemIdValue, number>;
  shopOpen: boolean;
  grid: GridState;
  phase: GamePhase;
  gameInfoOpen: boolean;
  bombFinderUses: number;
}

export function createInitialState(): GameState {
  const persistent = loadPersistentState();
  
  if (persistent) {
    const shouldResetGrid = !persistent.grid || persistent.phase === 'ended' || persistent.phase === 'setup';
    return {
      gold: persistent.gold,
      score: persistent.score,
      inventory: persistent.inventory,
      shopOpen: false,
      gameInfoOpen: false,
      grid: shouldResetGrid ? createGrid() : persistent.grid!,
      phase: shouldResetGrid ? 'setup' : 'playing',
      bombFinderUses: 0,
    };
  }
  
  return {
    gold: 100,
    score: 0,
    inventory: {
      [ItemId.Burger]: 10,
      [ItemId.Pizza]: 10,
      [ItemId.BombFinder]: 10,
    },
    shopOpen: false,
    gameInfoOpen: false,
    grid: createGrid(),
    phase: 'setup',
    bombFinderUses: 0,
  };
}
