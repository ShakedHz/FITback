import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CoinBadge } from '@/components/ui';
import { COIN_PACKAGES, getTotalCoins, formatPrice } from '@/data/coinPackages';
import { BRAND } from '@/data/brand';
import '@/components/CoinShop.css';

export function CoinShopPage() {
  const navigate = useNavigate();
  const { coins, purchaseCoinPackage } = useApp();
  const [selectedId, setSelectedId] = useState('popular');
  const [purchased, setPurchased] = useState(false);
  const [lastPurchase, setLastPurchase] = useState(0);

  const selected = COIN_PACKAGES.find((p) => p.id === selectedId) ?? COIN_PACKAGES[1];

  const handlePurchase = () => {
    const total = getTotalCoins(selected);
    const success = purchaseCoinPackage(selected.id, total, selected.price);
    if (success) {
      setLastPurchase(total);
      setPurchased(true);
      setTimeout(() => setPurchased(false), 2500);
    }
  };

  if (purchased) {
    return (
      <div className="page fade-in coin-shop-success">
        <Check size={40} color="#34d399" />
        <h1 className="page-title">Purchase complete!</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
          Added <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{lastPurchase.toLocaleString('en-US')}</span> coins to your wallet
        </p>
        <CoinBadge amount={coins} size="lg" />
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1 className="page-title">Coin shop</h1>
      <p className="page-subtitle">Buy {BRAND.coinsName} to unlock lesson plans and lessons</p>

      <div className="coin-shop-hero">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>Current balance</p>
        <CoinBadge amount={coins} size="lg" />
      </div>

      <p className="section-title">
        <ShoppingBag size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Choose a package
      </p>

      {COIN_PACKAGES.map((pkg) => {
        const total = getTotalCoins(pkg);
        const isSelected = selectedId === pkg.id;
        return (
          <div
            key={pkg.id}
            className={`card coin-package ${isSelected ? 'coin-package--selected' : ''} ${pkg.popular ? 'coin-package--popular' : ''}`}
            onClick={() => setSelectedId(pkg.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedId(pkg.id)}
          >
            {pkg.popular && <span className="coin-package__badge coin-package__badge--popular">Most popular</span>}
            {pkg.bestValue && <span className="coin-package__badge coin-package__badge--value">Best value</span>}
            <div className="coin-package__row">
              <div>
                <div className="coin-package__coins">
                  <span className="coin-package__amount">{total.toLocaleString('en-US')} coins</span>
                  {isSelected && <Check size={18} color="var(--color-primary-bright)" />}
                </div>
                {pkg.bonus > 0 && (
                  <p className="coin-package__bonus">+{pkg.bonus} free bonus!</p>
                )}
                <p className="coin-package__label">{pkg.label}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="coin-package__price">{formatPrice(pkg.price)}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                  {formatPrice(pkg.price / total)}/coin
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <div className="card" style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        <Sparkles size={14} color="var(--color-primary-bright)" style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Coins are used to purchase lesson plans, templates, and Remixes from other instructors
      </div>

      <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={handlePurchase}>
        Purchase — {formatPrice(selected.price)} · {getTotalCoins(selected).toLocaleString('en-US')} coins
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 12 }}>
        Secure payment · Demo (no real charge)
      </p>
    </div>
  );
}
