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
  compact?: boolean;
  matchPrefix?: boolean;
};

const tabsBefore: Tab[] = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.home' },
  { path: '/analytics', icon: BarChart3, labelKey: 'nav.ratings', matchPrefix: true, compact: true },
  { path: '/survey', icon: Users, labelKey: 'nav.clients', compact: true },
];

const centerTab = { path: '/create', icon: PlusCircle, labelKey: 'nav.new' };

const tabsAfter: Tab[] = [
  { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule', compact: true },
  { path: '/library', icon: Library, labelKey: 'nav.library', compact: true },
  { path: '/profile', icon: User, labelKey: 'nav.profile' },
];

function NavTab({ path, icon: Icon, labelKey, compact, matchPrefix }: Tab) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <NavLink
      to={path}
      className={({ isActive }) => {
        const active = matchPrefix
          ? location.pathname === path || location.pathname.startsWith(`${path}/`)
          : isActive;
        return `nav-item ${compact ? 'nav-compact' : ''} ${active ? 'active' : ''}`;
      }}
    >
      <Icon size={compact ? 18 : 20} strokeWidth={2} />
      <span className="nav-label">{t(labelKey)}</span>
    </NavLink>
  );
}

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
    path.startsWith('/auth/');

  if (hidden) return null;

  const CenterIcon = centerTab.icon;

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__side">
        {tabsBefore.map((tab) => (
          <NavTab key={tab.path} {...tab} />
        ))}
      </div>

      <NavLink
        to={centerTab.path}
        aria-label={t(centerTab.labelKey)}
        className={({ isActive }) => `nav-item nav-center ${isActive ? 'active' : ''}`}
      >
        <CenterIcon size={28} strokeWidth={2.5} />
      </NavLink>

      <div className="bottom-nav__side">
        {tabsAfter.map((tab) => (
          <NavTab key={tab.path} {...tab} />
        ))}
      </div>
    </nav>
  );
}
