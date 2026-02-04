import { ItemId } from './state.ts';
import type { GameState, ItemIdValue } from './state.ts';

export interface ShopItem {
  id: ItemIdValue;
  name: string;
  cost: number;
  icon: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: ItemId.Burger, name: 'Burger', cost: 1, icon: '🍔' },
  { id: ItemId.Pizza, name: 'Pizza', cost: 5, icon: '🍕' },
  { id: ItemId.BombFinder, name: 'Bomb Finder', cost: 10, icon: '🔍' },
];

export interface BuyResult {
  success: boolean;
  message: string;
}

export function buyItem(state: GameState, itemId: ItemIdValue): BuyResult {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, message: 'Unknown item!' };
  }
  if (state.gold < item.cost) {
    return { success: false, message: 'Not enough gold!' };
  }
  state.gold -= item.cost;
  state.inventory[itemId] += 1;
  return { success: true, message: `Bought ${item.name}!` };
}
