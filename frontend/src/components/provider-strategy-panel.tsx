import type { AppPath } from "./app-shell";
import { ProviderLogo } from "./provider-logo";
import type { MonitorSettings } from "../types/monitor";
import {
  getMonitorModeLabel,
  type ProviderRuntimeStat
} from "../utils/provider-runtime";

export function ProviderStrategyPanel({
  isOpen,
  monitorSettings,
  providerStats,
  onToggleOpen,
  onNavigate
}: {
  isOpen: boolean;
  monitorSettings: MonitorSettings;
  providerStats: ProviderRuntimeStat[];
  onToggleOpen: () => void;
  onNavigate: (path: AppPath) => void;
}) {
  const activeProviderStats = providerStats.filter(({ provider }) => provider.isEnabled);
  const activeProviderCount = activeProviderStats.length;
  const currentProvider =
    providerStats.find((provider) => provider.isCurrentProvider)?.provider.target ?? "No data";

  return (
    <section className={`provider-panel${isOpen ? " is-open" : ""}`} aria-label="Provider strategy">
      <button
        type="button"
        className="provider-panel__toggle"
        aria-expanded={isOpen}
        onClick={onToggleOpen}
      >
        <div className="provider-panel__toggle-copy">
          <span className="provider-panel__eyebrow">Provider strategy</span>
          <strong>{isOpen ? "Hide provider summary" : "Show provider summary"}</strong>
        </div>
        <div className="provider-panel__summary mono">
          <span>{getMonitorModeLabel(monitorSettings.roundRobinEnabled)}</span>
          <span>{activeProviderCount} active</span>
          <span>Current: {currentProvider}</span>
        </div>
      </button>

      {isOpen ? (
        <div className="provider-panel__content">
          <div className="provider-panel__header">
            <div>
              <span className="provider-panel__eyebrow">Runtime summary</span>
              <h2>Providers in rotation</h2>
            </div>
            <div className="provider-panel__actions">
              <div className="provider-panel__mode">
                <span className="provider-panel__mode-label">Mode</span>
                <span className="provider-panel__mode-value mono">
                  {getMonitorModeLabel(monitorSettings.roundRobinEnabled)}
                </span>
              </div>
              <button
                type="button"
                className="provider-panel__link"
                onClick={() => onNavigate("/providers")}
              >
                Manage providers
              </button>
            </div>
          </div>

          {activeProviderStats.length > 0 ? (
            <div className="provider-panel__grid">
              {activeProviderStats.map(
                ({ provider, averageLatencyMs, successfulProbeCount, isCurrentProvider }) => (
                  <article
                    key={provider.id}
                    className={`provider-card${isCurrentProvider ? " is-current" : ""}`}
                  >
                    <div className="provider-card__header">
                      <div className="provider-card__identity">
                        <ProviderLogo company={provider.company} logoUrl={provider.logoUrl} />
                        <div className="provider-card__identity-copy">
                          <strong>{provider.company ?? provider.label}</strong>
                          <span className="mono">{provider.target}</span>
                        </div>
                      </div>
                      <span className={`provider-card__badge mono${isCurrentProvider ? " is-current" : ""}`}>
                        {isCurrentProvider ? "Current" : "Active"}
                      </span>
                    </div>

                    <p className="provider-card__label">{provider.label}</p>

                    <dl className="provider-card__metrics">
                      <div>
                        <dt>Average Ping</dt>
                        <dd className="mono">
                          {averageLatencyMs === null ? "No data" : `${averageLatencyMs} ms`}
                        </dd>
                      </div>
                      <div>
                        <dt>Successful Probes</dt>
                        <dd className="mono">{successfulProbeCount}</dd>
                      </div>
                    </dl>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="provider-panel__empty">
              <p className="eyebrow">No active providers</p>
              <p className="provider-panel__empty-copy">
                Enable at least one provider from the management page to resume probing.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
