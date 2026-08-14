import { Star } from 'lucide-react';

interface CoinBadgeProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  prominent?: boolean;
}

export function CoinBadge({ amount, size = 'md', prominent }: CoinBadgeProps) {
  const sizes = { sm: 14, md: 18, lg: 24 };
  return (
    <span className={`coin ${prominent ? 'coin--prominent' : ''}`} style={prominent ? undefined : { fontSize: sizes[size] }}>
      <span>{amount.toLocaleString('en-US')}</span>
      {prominent && <span className="coin--prominent__unit">coins</span>}
    </span>
  );
}

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ value, onChange, readonly, size = 32 }: StarRatingProps) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`star ${active ? 'active' : ''}`}
            style={{ width: size, height: size }}
            onClick={() => !readonly && onChange?.(star)}
            disabled={readonly}
            aria-label={`${star} stars`}
          >
            <Star
              size={size}
              strokeWidth={1.5}
              fill={active ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}
