import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Library,
  User,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import './BottomNav.css';

type Tab = {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  matchPrefix?: boolean;
};

const tabs: Tab[] = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.home' },
  { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule' },
  { path: '/library', icon: Library, labelKey: 'nav.library' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings', matchPrefix: true },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

function NavTab({ path, icon: Icon, labelKey, matchPrefix }: Tab) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <NavLink
      to={path}
      className={({ isActive }) => {
        const active = matchPrefix
          ? location.pathname === path || location.pathname.startsWith(`${path}/`)
          : isActive;
        return `nav-item ${active ? 'active' : ''}`;
      }}
    >
      <Icon size={20} strokeWidth={2} />
      <span className="nav-label">{t(labelKey)}</span>
    </NavLink>
  );
}

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const hidden =
    path === '/' ||
    path === '/login' ||
    path === '/register' ||
    path === '/onboarding' ||
    path.startsWith('/feedback') ||
    path.startsWith('/auth/');

  if (hidden) return null;

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavTab key={tab.path} {...tab} />
      ))}
    </nav>
  );
}
