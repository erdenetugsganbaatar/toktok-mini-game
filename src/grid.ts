export const GRID_SIZE = 7;
export const BOMB_COUNT = 7;
export const BURGER_REWARD = 200;
export const PIZZA_REWARD = 1000;

export type CellState = 'empty' | 'bomb' | 'burger' | 'pizza';

export interface GridState {
  cells: CellState[];
  revealed: boolean[];
  marked: boolean[];
}

export function createGrid(
  gridSize: number = GRID_SIZE,
  bombCount: number = BOMB_COUNT,
): GridState {
  const total = gridSize * gridSize;
  const clamped = Math.min(bombCount, total);

  const cells = new Array<CellState>(total).fill('empty');
  for (let i = total - clamped; i < total; i++) {
    cells[i] = 'bomb';
  }

  return { 
    cells, 
    revealed: new Array<boolean>(total).fill(false),
    marked: new Array<boolean>(total).fill(false),
  };
}

export function addBurgerToGrid(grid: GridState): boolean {
  const idx = grid.cells.indexOf('empty');
  if (idx === -1) return false;
  grid.cells[idx] = 'burger';
  return true;
}

export function addPizzaToGrid(grid: GridState): boolean {
  const idx = grid.cells.indexOf('empty');
  if (idx === -1) return false;
  grid.cells[idx] = 'pizza';
  return true;
}

export function shuffleCells(grid: GridState): void {
  const cells = grid.cells;
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
}

export function markBomb(grid: GridState): number | null {
  const availableBombs: number[] = [];
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] === 'bomb' && !grid.revealed[i] && !grid.marked[i]) {
      availableBombs.push(i);
    }
  }
  
  if (availableBombs.length === 0) return null;
  
  const randomIdx = Math.floor(Math.random() * availableBombs.length);
  const bombIdx = availableBombs[randomIdx];
  grid.marked[bombIdx] = true;
  return bombIdx;
}
