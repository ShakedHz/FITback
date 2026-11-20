import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Library,
  User,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n';
import './BottomNav.css';

type Tab = {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  matchPrefix?: boolean;
};

function NavTab({
  path,
  icon: Icon,
  labelKey,
  matchPrefix,
}: Tab) {
  const location = useLocation();
  const { t } = useI18n();
  const current = location.pathname;

  return (
    <NavLink
      to={path}
      className={() => {
        let active = matchPrefix
          ? current === path || current.startsWith(`${path}/`)
          : current === path;

        // Profile owns settings + clients + team, but not the manager Home overview.
        if (path === '/profile' && (current === '/settings' || current === '/clients' || current.startsWith('/studio'))) {
          active = true;
        }

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
  const { isActiveStudioManager } = useAuth();
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

  const tabs: Tab[] = [
    {
      path: isActiveStudioManager ? '/studio/overview' : '/dashboard',
      icon: LayoutDashboard,
      labelKey: 'nav.home',
    },
    { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule' },
    { path: '/library', icon: Library, labelKey: 'nav.library' },
    { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings', matchPrefix: true },
    { path: '/profile', icon: User, labelKey: 'nav.profile' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <NavTab key={tab.path} {...tab} />
      ))}
    </nav>
  );
}
