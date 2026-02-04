import { SHOP_ITEMS, buyItem } from './shop.ts';
import { GRID_SIZE, BURGER_REWARD, PIZZA_REWARD, addBurgerToGrid, addPizzaToGrid, shuffleCells, markBomb } from './grid.ts';
import { BOMB_FINDER_MAX_USES, ItemId, createInitialState, saveState } from './state.ts';
import type { GameState } from './state.ts';

let goldDisplay: HTMLElement;
let scoreDisplay: HTMLElement;
let inventoryDisplay: HTMLElement;
let shopOverlay: HTMLElement;
let shopItemsContainer: HTMLElement;
let feedbackMessage: HTMLElement;
let feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
let gameInfoOverlay: HTMLElement;
let gameInfoContainer: HTMLElement;
let gridCells: HTMLElement[] = [];
let burgerBtn: HTMLButtonElement;
let pizzaBtn: HTMLButtonElement;
let startBtn: HTMLButtonElement;
let findBombBtn: HTMLButtonElement;
let restartOverlay: HTMLElement;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function initUI(state: GameState, onStateChange: () => void): void {
  const wrappedOnStateChange = () => {
    saveState(state);
    onStateChange();
  };
  
  const app = document.getElementById('app')!;
  app.innerHTML = '';

  // --- HUD ---
  const hud = el('div', 'hud');

  inventoryDisplay = el('div', 'hud-inventory');
  goldDisplay = el('div', 'hud-gold');
  scoreDisplay = el('div', 'hud-score')
  const gameInfoBtn = el('button', 'hud-shop-btn', 'GAME INFO');
  gameInfoBtn.addEventListener('click', () => {
    state.gameInfoOpen = true;
    wrappedOnStateChange();
  });
  const shopBtn = el('button', 'hud-shop-btn', 'SHOP');
  shopBtn.addEventListener('click', () => {
    state.shopOpen = true;
    wrappedOnStateChange();
  });

  hud.append(inventoryDisplay, goldDisplay, scoreDisplay, gameInfoBtn, shopBtn);
  app.appendChild(hud);

  // --- Grid area ---
  const gridArea = el('div', 'grid-area');

  const grid = el('div', 'grid');
  grid.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;

  gridCells = [];
  const totalCells = GRID_SIZE * GRID_SIZE;
  for (let i = 0; i < totalCells; i++) {
    const cell = el('div', 'grid-cell');
    cell.addEventListener('click', () => {
      if (state.phase !== 'playing') return;
      if (state.grid.revealed[i]) return;
      if (state.grid.marked[i]) return;

      state.grid.revealed[i] = true;

      // Flip animation to reveal
      cell.classList.add('flipping');
      setTimeout(() => {
        const value = state.grid.cells[i];
        cell.textContent = value === 'bomb' ? '💣' : value === 'burger' ? '🍔' : '';
      }, 250);
      setTimeout(() => {
        cell.classList.remove('flipping');

        const value = state.grid.cells[i];
        if (value === 'burger') {
          state.score += BURGER_REWARD;
        } else if (value === 'pizza') {
          state.score += PIZZA_REWARD;
        } else if (value === 'bomb') {
          state.phase = 'ended';
          state.grid.revealed.fill(true);
        }
        wrappedOnStateChange();
      }, 500);
    });
    gridCells.push(cell);
    grid.appendChild(cell);
  }

  const gridButtons = el('div', 'grid-buttons');
  startBtn = el('button', 'grid-btn grid-btn-start', 'START') as HTMLButtonElement;
  startBtn.addEventListener('click', () => {
    if (state.phase !== 'setup') return;
    state.phase = 'shuffling';
    state.bombFinderUses = 0;
    saveState(state);
    wrappedOnStateChange();
    runShuffleAnimation(state, wrappedOnStateChange);
  });
  burgerBtn = el('button', 'grid-btn grid-btn-gem', 'ADD BURGER') as HTMLButtonElement;
  burgerBtn.addEventListener('click', () => {
    if (state.inventory[ItemId.Burger] <= 0) return;
    const placed = addBurgerToGrid(state.grid);
    if (!placed) return;
    state.inventory[ItemId.Burger] -= 1;
    onStateChange();
  });
  pizzaBtn = el('button', 'grid-btn grid-btn-gem', 'ADD PIZZA') as HTMLButtonElement;
  pizzaBtn.addEventListener('click', () => {
    if (state.inventory[ItemId.Pizza] <= 0) return;
    const placed = addPizzaToGrid(state.grid);
    if (!placed) return;
    state.inventory[ItemId.Pizza] -= 1;
    onStateChange();
  });

  findBombBtn = el('button', 'grid-btn grid-btn-find-bomb', `FIND BOMB (${BOMB_FINDER_MAX_USES - state.bombFinderUses})`) as HTMLButtonElement;
  findBombBtn.addEventListener('click', () => {
    if (state.phase !== 'playing') return;
    if (state.inventory[ItemId.BombFinder] <= 0) return;
    if (state.bombFinderUses >= BOMB_FINDER_MAX_USES) return;
    const bombIdx = markBomb(state.grid);
    if (bombIdx === null) return;
    state.inventory[ItemId.BombFinder] -= 1;
    state.bombFinderUses += 1;
    wrappedOnStateChange();
  });
  gridButtons.append(startBtn, burgerBtn, pizzaBtn, findBombBtn);

  gridArea.append(grid, gridButtons);
  app.appendChild(gridArea);

  // --- Shop overlay ---
  shopOverlay = el('div', 'shop-overlay');
  shopOverlay.addEventListener('click', (e) => {
    if (e.target === shopOverlay) {
      state.shopOpen = false;
      wrappedOnStateChange();
    }
  });

  const shopModal = el('div', 'shop-modal');

  const shopTitle = el('h2', 'shop-title', 'SHOP');
  shopModal.appendChild(shopTitle);

  shopItemsContainer = el('div', 'shop-items');
  for (const item of SHOP_ITEMS) {
    const row = el('div', 'shop-row');
    row.dataset.itemId = item.id;

    const info = el('span', 'shop-item-info');
    info.textContent = `${item.icon} ${item.name}`;

    const cost = el('span', 'shop-item-cost', `${item.cost}G`);

    const buyBtn = el('button', 'shop-buy-btn', 'BUY');
    buyBtn.addEventListener('click', () => {
      const result = buyItem(state, item.id);
      showFeedback(result.message, result.success);
      if (state.phase === 'playing') {
        wrappedOnStateChange();
      } else {
        onStateChange();
      }
    });

    row.append(info, cost, buyBtn);
    shopItemsContainer.appendChild(row);
  }
  shopModal.appendChild(shopItemsContainer);

  feedbackMessage = el('div', 'shop-feedback');
  shopModal.appendChild(feedbackMessage);

  const closeBtn = el('button', 'shop-close-btn', 'CLOSE');
  closeBtn.addEventListener('click', () => {
    state.shopOpen = false;
    wrappedOnStateChange();
  });
  shopModal.appendChild(closeBtn);

  shopOverlay.appendChild(shopModal);
  app.appendChild(shopOverlay);

  // --- Restart overlay ---
  restartOverlay = el('div', 'restart-overlay');
  const restartTitle = el('div', 'restart-title', 'GAME OVER');
  const restartBtn = el('button', 'restart-btn', 'RESTART');
  restartBtn.addEventListener('click', () => {
    const newState = createInitialState();
    initUI(newState, () => render(newState));
  });
  restartOverlay.append(restartTitle, restartBtn);
  app.appendChild(restartOverlay);


  // --- GameInfo overlay ---
  gameInfoOverlay = el('div', 'game-info-overlay');
  gameInfoOverlay.addEventListener('click', (e: Event) => {
    if (e.target === gameInfoOverlay) {
      state.gameInfoOpen = false;
      wrappedOnStateChange();
    }
  });
  gameInfoContainer = el('div', 'game-info');
  gameInfoContainer.innerHTML = `
  <h2>🎮 How to Play</h2>

  <p>
    The goal of the game is simple: <strong>place food on the grid and then find it to earn points.</strong>
    The more food you add, the higher your chances of scoring — but beware of bombs!
  </p>

  <h3>🕹 Gameplay</h3>
  <ul>
    <li>Add food to the grid.</li>
    <li>Click tiles to find your food and gain score.</li>
    <li>Adding more food increases your chances of finding one.</li>
    <li>If you click a bomb — <strong>kaboom!</strong> All food on the grid is destroyed.</li>
  </ul>

  <h3>📦 Items & Scores</h3>

  <ul>
    <li>
      <strong>🍔 Burger</strong><br>
      Find it to earn <strong>+200 points</strong>.
    </li>

    <li>
      <strong>🍕 Pizza</strong><br>
      Find it to earn <strong>+1000 points</strong>.
    </li>

    <li>
      <strong>🔍 Bomb Finder</strong><br>
      Helps locate a bomb and marks it for you.
    </li>
  </ul>

  <h3>⚠️ Warning</h3>
  <p>
    Clicking on a bomb will instantly destroy all food on the grid — so use your Bomb Finders wisely!
  </p>

  <p><strong>Good luck, and may your grid be full of food! 🍔🍕</strong></p>
  `
  const closeInfoBtn = el('button', 'shop-close-btn', 'CLOSE');
  closeInfoBtn.addEventListener('click', () => {
    state.gameInfoOpen = false;
    wrappedOnStateChange();
  });
  gameInfoContainer.appendChild(closeInfoBtn);
  gameInfoOverlay.append(gameInfoContainer);

  app.appendChild(gameInfoOverlay)

  render(state);
}

function showFeedback(message: string, success: boolean): void {
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  feedbackMessage.textContent = message;
  feedbackMessage.className = success
    ? 'shop-feedback feedback-success'
    : 'shop-feedback feedback-fail';

  if (!success) {
    feedbackMessage.classList.remove('shake');
    // Force reflow to restart animation
    void feedbackMessage.offsetWidth;
    feedbackMessage.classList.add('shake');
  }

  feedbackTimeout = setTimeout(() => {
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'shop-feedback';
  }, 1500);
}

function runShuffleAnimation(state: GameState, onStateChange: () => void): void {
  const flipDuration = 500;
  const staggerStep = 30;
  const totalFlipTime = flipDuration + staggerStep * (gridCells.length - 1);

  // Phase 1: Staggered flip
  gridCells.forEach((cell, i) => {
    const delay = i * staggerStep;
    cell.style.setProperty('--flip-delay', `${delay}ms`);
    cell.classList.add('flipping');

    setTimeout(() => {
      cell.textContent = '?';
    }, delay + flipDuration / 2);
  });

  // Phase 2: After all flips, pair-swap rounds
  setTimeout(() => {
    gridCells.forEach((cell) => {
      cell.classList.remove('flipping');
      cell.style.removeProperty('--flip-delay');
    });

    runSwapRounds(() => {
      shuffleCells(state.grid);
      state.phase = 'playing';
      onStateChange();
    });
  }, totalFlipTime);
}

function runSwapRounds(callback: () => void): void {
  const totalRounds = 5;
  const roundDuration = 200;
  let currentRound = 0;

  function doRound(): void {
    if (currentRound >= totalRounds) {
      callback();
      return;
    }

    // Build shuffled index list to form random pairs
    const indices = Array.from({ length: gridCells.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < indices.length; i += 2) {
      pairs.push([indices[i], indices[i + 1]]);
    }

    // Animate each pair sliding to each other's position
    for (const [a, b] of pairs) {
      const cellA = gridCells[a];
      const cellB = gridCells[b];
      const rectA = cellA.getBoundingClientRect();
      const rectB = cellB.getBoundingClientRect();

      const dx = rectB.left - rectA.left;
      const dy = rectB.top - rectA.top;

      cellA.style.transition = `transform ${roundDuration}ms ease-in-out`;
      cellB.style.transition = `transform ${roundDuration}ms ease-in-out`;
      cellA.style.zIndex = '1';
      cellB.style.zIndex = '1';

      cellA.style.transform = `translate(${dx}px, ${dy}px)`;
      cellB.style.transform = `translate(${-dx}px, ${-dy}px)`;
    }

    // After animation, reset transforms (invisible since all cells show "?")
    setTimeout(() => {
      for (const [a, b] of pairs) {
        const cellA = gridCells[a];
        const cellB = gridCells[b];
        cellA.style.transition = '';
        cellB.style.transition = '';
        cellA.style.transform = '';
        cellB.style.transform = '';
        cellA.style.zIndex = '';
        cellB.style.zIndex = '';
      }

      currentRound++;
      doRound();
    }, roundDuration);
  }

  doRound();
}

export function render(state: GameState): void {
  // Gold
  goldDisplay.textContent = `Gold: ${state.gold}`;

  // Score
  scoreDisplay.textContent = `Score: ${state.score}`;

  // Inventory
  const items = SHOP_ITEMS.filter((i) => state.inventory[i.id] > 0);
  if (items.length === 0) {
    inventoryDisplay.textContent = 'Inventory: empty';
  } else {
    inventoryDisplay.innerHTML = '';
    for (const item of items) {
      const chip = el('span', 'inv-chip');
      chip.textContent = `${item.icon} ${item.name} x${state.inventory[item.id]}`;
      inventoryDisplay.appendChild(chip);
    }
  }

  // Shop overlay visibility
  shopOverlay.classList.toggle('visible', state.shopOpen);

  // Buy button disabled states
  const rows = shopItemsContainer.querySelectorAll('.shop-row');
  for (const row of rows) {
    const itemId = (row as HTMLElement).dataset.itemId;
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    const btn = row.querySelector('.shop-buy-btn') as HTMLButtonElement;
    if (item && btn) {
      btn.disabled = state.gold < item.cost;
    }
  }

  // Grid cells
  for (let i = 0; i < gridCells.length; i++) {
    const cell = gridCells[i];
        const value = state.grid.cells[i];

    if (state.phase === 'playing') {
      if (state.grid.marked[i]) {
        cell.textContent = 'X';
        cell.classList.remove('face-down');
        cell.classList.add('marked');
      } else if (state.grid.revealed[i]) {
        cell.textContent = value === 'bomb' ? '💣' : value === 'burger' ? '🍔' : value === 'pizza' ? '🍕' : '';
        cell.classList.remove('face-down');
        cell.classList.add('revealed');
      } else {
        cell.textContent = '?';
        cell.classList.add('face-down');
        cell.classList.remove('revealed', 'marked');
      }
    } else if (state.phase === 'ended') {
      cell.textContent = value === 'bomb' ? '💣' : value === 'burger' ? '🍔' : value === 'pizza' ? '🍕' : '';
      cell.classList.remove('face-down', 'marked');
      cell.classList.add('revealed');
    } else if (state.phase === 'setup') {
      cell.classList.remove('face-down', 'revealed', 'marked');
      switch (value) {
        case 'bomb':
          cell.textContent = '💣';
          break;
        case 'burger':
          cell.textContent = '🍔';
          break;
        case 'pizza':
          cell.textContent = '🍕';
          break;
        default:
          cell.textContent = '';
          break;
      }
    }
    // 'shuffling': animation manages content directly — skip
  }

  // Restart overlay visibility
  restartOverlay.classList.toggle('visible', state.phase === 'ended');

  // GameInfo overlay visibility
  gameInfoOverlay.classList.toggle('visible', state.gameInfoOpen);

  // Button states based on phase
  if (state.phase === 'setup') {
    const hasBurgers = state.inventory[ItemId.Burger] > 0;
    const hasPizzas = state.inventory[ItemId.Pizza] > 0;
    const hasEmpty = state.grid.cells.includes('empty');
    const hasItemsInGrid = state.grid.cells.includes('burger') || state.grid.cells.includes('pizza');
    burgerBtn.disabled = !hasBurgers || !hasEmpty;
    pizzaBtn.disabled = !hasPizzas || !hasEmpty;
    burgerBtn.hidden = false;
    pizzaBtn.hidden = false;
    startBtn.disabled = !hasItemsInGrid;
    findBombBtn.disabled = true;
    findBombBtn.hidden = true;
    findBombBtn.textContent = `FIND BOMB (${BOMB_FINDER_MAX_USES - state.bombFinderUses})`;
  } else if (state.phase === 'playing') {
    burgerBtn.disabled = true;
    pizzaBtn.disabled = true;
    burgerBtn.hidden = true;
    pizzaBtn.hidden = true;
    startBtn.disabled = true;
    findBombBtn.disabled = state.inventory[ItemId.BombFinder] <= 0 || state.bombFinderUses >= BOMB_FINDER_MAX_USES;
    findBombBtn.hidden = false;
    findBombBtn.textContent = `FIND BOMB (${BOMB_FINDER_MAX_USES - state.bombFinderUses})`;
  } else {
    burgerBtn.disabled = true;
    pizzaBtn.disabled = true;
    burgerBtn.hidden = true;
    pizzaBtn.hidden = true;
    startBtn.disabled = true;
    findBombBtn.disabled = true;
    findBombBtn.hidden = true;
    findBombBtn.textContent = `FIND BOMB (${BOMB_FINDER_MAX_USES - state.bombFinderUses})`;
  }
}
