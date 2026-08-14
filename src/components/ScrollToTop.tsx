import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scroll the app content pane to top on every route change. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const content = document.querySelector('.app-content');
    if (content instanceof HTMLElement) {
      content.scrollTop = 0;
      content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}
