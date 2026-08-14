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
import './BottomNav.css';

type Tab = {
  path: string;
  icon: typeof LayoutDashboard;
  label: string;
  compact?: boolean;
  matchPrefix?: boolean;
};

const tabsBefore: Tab[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/analytics', icon: BarChart3, label: 'Ratings', matchPrefix: true, compact: true },
  { path: '/survey', icon: Users, label: 'Clients', compact: true },
];

const centerTab = { path: '/create', icon: PlusCircle, label: 'New' };

const tabsAfter: Tab[] = [
  { path: '/schedule', icon: Calendar, label: 'Schedule', compact: true },
  { path: '/library', icon: Library, label: 'Library', compact: true },
  { path: '/profile', icon: User, label: 'Profile' },
];

function NavTab({ path, icon: Icon, label, compact, matchPrefix }: Tab) {
  const location = useLocation();

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
      <span className="nav-label">{label}</span>
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
