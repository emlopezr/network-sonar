import { useEffect, useState } from "react";

import type { AppPath } from "./components/app-shell";
import { Dashboard } from "./pages/dashboard";
import { IncidentsPage } from "./pages/incidents";
import { ProvidersPage } from "./pages/providers";

function normalizePathname(pathname: string): AppPath {
  if (pathname === "/incidents") {
    return "/incidents";
  }

  if (pathname === "/config") {
    return "/config";
  }

  return "/";
}

export function App() {
  const [pathname, setPathname] = useState<AppPath>(() => normalizePathname(window.location.pathname));

  useEffect(() => {
    function handlePopState(): void {
      setPathname(normalizePathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigate(nextPath: AppPath): void {
    if (nextPath === pathname) {
      return;
    }

    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  }

  if (pathname === "/incidents") {
    return <IncidentsPage onNavigate={navigate} />;
  }

  if (pathname === "/config") {
    return <ProvidersPage onNavigate={navigate} />;
  }

  return <Dashboard onNavigate={navigate} />;
}
