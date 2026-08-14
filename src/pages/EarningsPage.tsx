import { useNavigate } from 'react-router-dom';
import { TrendingUp, Star, Users, RefreshCw, ShoppingBag } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CoinBadge } from '@/components/ui';

const earnMethods = [
  { icon: Star, title: 'High rating', desc: 'Lessons rated 4.5+ earn coins', coins: '+50' },
  { icon: RefreshCw, title: 'Client retention', desc: 'Students who return to your lessons', coins: '+30' },
  { icon: Users, title: 'Active clients', desc: 'Growth in active students', coins: '+20' },
  { icon: TrendingUp, title: 'Lesson sales', desc: 'Other instructors buy your lesson plan', coins: '+250' },
];

export function EarningsPage() {
  const navigate = useNavigate();
  const { coins, transactions } = useApp();

  return (
    <div className="page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
      <h1 className="page-title">My wallet</h1>

      <div
        className="card card-glow"
        style={{
          textAlign: 'center',
          padding: 28,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.1))',
          marginTop: 16,
        }}
      >
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Current balance</p>
        <CoinBadge amount={coins} size="lg" />
        <button
          className="btn btn-gold btn-sm"
          style={{ marginTop: 16, maxWidth: 220, margin: '16px auto 0' }}
          onClick={() => navigate('/shop')}
        >
          <ShoppingBag size={16} /> Buy coins
        </button>
      </div>

      <p className="section-title" style={{ marginTop: 24 }}>How do you earn coins?</p>
      {earnMethods.map((method) => {
        const Icon = method.icon;
        return (
          <div key={method.title} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color="#a78bfa" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{method.title}</p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{method.desc}</p>
              </div>
              <span className="tag tag-gold">{method.coins}</span>
            </div>
          </div>
        );
      })}

      <p className="section-title" style={{ marginTop: 24 }}>Transaction history</p>
      {transactions.map((tx) => (
        <div key={tx.id} className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{tx.desc}</p>
              <p style={{ fontSize: 12, color: '#64748b' }}>{tx.date}</p>
            </div>
            <span style={{ color: tx.amount > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {tx.amount > 0 ? '+' : ''}{tx.amount}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
