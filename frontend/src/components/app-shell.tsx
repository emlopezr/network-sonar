import type { MouseEvent, ReactNode } from "react";

export type AppPath = "/" | "/incidents" | "/providers";
type AppPage = "dashboard" | "incidents" | "providers";

const navigationItems: Array<{ id: AppPage; label: string; path: AppPath }> = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/"
  },
  {
    id: "incidents",
    label: "Incidents",
    path: "/incidents"
  },
  {
    id: "providers",
    label: "Configuration",
    path: "/providers"
  }
];

export function AppShell({
  activePage,
  children,
  onNavigate,
  topbarContent
}: {
  activePage: AppPage;
  children: ReactNode;
  onNavigate: (path: AppPath) => void;
  topbarContent?: ReactNode;
}) {
  function handleNavigation(event: MouseEvent<HTMLAnchorElement>, path: AppPath): void {
    event.preventDefault();
    onNavigate(path);
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__brand">
          <div className="dashboard-sidebar__brand-row">
            <span className="dashboard-sidebar__sensor" aria-hidden="true" />
            <div>
              <div className="dashboard-sidebar__node mono">SONAR-01</div>
              <div className="dashboard-sidebar__state mono">Local Node Active</div>
            </div>
          </div>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Primary">
          {navigationItems.map((item) => (
            <a
              key={item.id}
              href={item.path}
              className={`dashboard-sidebar__link${item.id === activePage ? " is-active" : ""}`}
              aria-current={item.id === activePage ? "page" : undefined}
              onClick={(event) => handleNavigation(event, item.path)}
            >
              <span className="dashboard-sidebar__link-mark" aria-hidden="true" />
              <span className="mono">{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__left">
            <span className="dashboard-topbar__brand">NETWORK SONAR</span>
            <span className="dashboard-topbar__divider" aria-hidden="true" />
            {topbarContent ?? null}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
