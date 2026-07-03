import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ymHit } from '@/lib/metrica';

// ponytail: only public routes — authenticated app pages never reach Metrica/WebVisor
const PUBLIC_ROUTES = ['/', '/login'];

export function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (PUBLIC_ROUTES.includes(pathname)) ymHit(window.location.href);
  }, [pathname]);
  return null;
}
