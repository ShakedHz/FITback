import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, LayoutDashboard, Library, User } from 'lucide-react';
import { useI18n } from '@/i18n';
import './BottomNav.css';

type Tab = {
  path: string;
  icon: typeof Calendar;
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

        if (path === '/profile' && current === '/settings') active = true;

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
    path.startsWith('/auth/');

  if (hidden) return null;

  const tabs: Tab[] = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.home' },
    { path: '/schedule', icon: Calendar, labelKey: 'nav.schedule' },
    { path: '/library', icon: Library, labelKey: 'nav.library', matchPrefix: true },
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
