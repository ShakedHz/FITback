export interface CoinPackage {
  id: string;
  coins: number;
  bonus: number;
  price: number;
  label: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'starter', coins: 100, bonus: 0, price: 9.9, label: 'Starter' },
  { id: 'popular', coins: 300, bonus: 50, price: 24.9, label: 'Popular', popular: true },
  { id: 'pro', coins: 600, bonus: 150, price: 44.9, label: 'Pro' },
  { id: 'studio', coins: 1500, bonus: 500, price: 99.9, label: 'Studio', bestValue: true },
];

export function getTotalCoins(pkg: CoinPackage): number {
  return pkg.coins + pkg.bonus;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(price % 1 === 0 ? 0 : 1)}`;
}
