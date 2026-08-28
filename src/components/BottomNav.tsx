import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  PlusCircle,
  Users,
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
  { path: '/create', icon: PlusCircle, labelKey: 'nav.new' },
  { path: '/library', icon: Library, labelKey: 'nav.library' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings', matchPrefix: true },
  { path: '/survey', icon: Users, labelKey: 'nav.clients' },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { t } = useI18n();
  const path = location.pathname;
  const hidden =
    path === '/' ||
    path === '/login' ||
    path === '/register' ||
    path === '/onboarding' ||
    path.startsWith('/feedback') ||
    path.startsWith('/auth/') ||
    path.startsWith('/join');

  if (hidden) return null;

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path: to, icon: Icon, labelKey, matchPrefix }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => {
            let active = matchPrefix
              ? location.pathname === to || location.pathname.startsWith(`${to}/`)
              : isActive;
            if (
              to === '/profile' &&
              (path === '/settings' || path.startsWith('/studio'))
            ) {
              active = true;
            }
            return `nav-item${active ? ' active' : ''}`;
          }}
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden />
          <span className="nav-label">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
