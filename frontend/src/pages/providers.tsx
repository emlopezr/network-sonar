import { startTransition, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";

import type { AppPath } from "../components/app-shell";
import { AppShell } from "../components/app-shell";
import { ProviderLogo } from "../components/provider-logo";
import {
  createMonitorProvider,
  deleteMonitorProvider,
  fetchBootstrap,
  reorderMonitorProviders,
  updateMonitorProvider,
  updateMonitorSettings
} from "../services/api-client";
import { connectStatusStream } from "../services/status-stream";
import type {
  BootstrapResponse,
  CurrentStatusSnapshot,
  MonitorProviderRecord,
  MonitorSample,
  MonitorSettings
} from "../types/monitor";
import {
  buildProviderRuntimeStats,
  getMonitorModeLabel
} from "../utils/provider-runtime";
import { getRangeSeconds } from "../utils/range";

const defaultMonitorSettings: MonitorSettings = {
  roundRobinEnabled: false,
  providers: []
};

function normalizeCurrentSnapshot(
  previous: CurrentStatusSnapshot | null,
  sample: MonitorSample
): CurrentStatusSnapshot {
  const staleAfterSeconds = previous?.staleAfterSeconds ?? 15;
  const lastChangeAt =
    !previous || previous.status !== sample.status ? sample.observedAt : previous.lastChangeAt;

  return {
    observedAt: sample.observedAt,
    status: sample.status,
    externalTarget: sample.externalTarget,
    externalOk: sample.externalOk,
    externalLatencyMs: sample.externalLatencyMs,
    failureReason: sample.failureReason,
    staleAfterSeconds,
    lastChangeAt
  };
}

function mergeHistorySample(
  history: MonitorSample[],
  incoming: MonitorSample,
  minObservedAt: number
): MonitorSample[] {
  const deduped = history.filter((sample) => sample.observedAt !== incoming.observedAt);
  return [...deduped, incoming]
    .filter((sample) => sample.observedAt >= minObservedAt)
    .sort((left, right) => left.observedAt - right.observedAt);
}

export function ProvidersPage({
  onNavigate = () => undefined
}: {
  onNavigate?: (path: AppPath) => void;
}) {
  const [monitorSettings, setMonitorSettings] = useState<MonitorSettings>(defaultMonitorSettings);
  const [current, setCurrent] = useState<CurrentStatusSnapshot | null>(null);
  const [history, setHistory] = useState<MonitorSample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingRoundRobin, setSavingRoundRobin] = useState(false);
  const [pendingProviderId, setPendingProviderId] = useState<number | null>(null);
  const [savingProviderForm, setSavingProviderForm] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customTarget, setCustomTarget] = useState("");
  const [customLogoUrl, setCustomLogoUrl] = useState("");

  const rangeWindow = getRangeSeconds("24h");
  const providerStats = useMemo(
    () =>
      buildProviderRuntimeStats(
        monitorSettings.providers,
        history,
        current?.externalTarget ?? null
      ),
    [current?.externalTarget, history, monitorSettings.providers]
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setError(null);

      try {
        const payload: BootstrapResponse = await fetchBootstrap("24h");

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCurrent(payload.current);
          setHistory(payload.history);
          setMonitorSettings(payload.monitorSettings);
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the provider settings."
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const disconnect = connectStatusStream({
      onOpen: () => undefined,
      onSnapshot: (payload) => {
        setCurrent(payload.current);
      },
      onSettings: (payload) => {
        setMonitorSettings(payload.monitorSettings);
        setSavingRoundRobin(false);
        setPendingProviderId(null);
        setSavingProviderForm(false);
      },
      onSample: (payload) => {
        setCurrent((previous) => normalizeCurrentSnapshot(previous, payload));
        setHistory((previous) =>
          mergeHistorySample(previous, payload, payload.observedAt - rangeWindow)
        );
      },
      onHeartbeat: () => undefined,
      onError: () => undefined
    });

    return disconnect;
  }, [rangeWindow]);

  useEffect(() => {
    if (!isProviderModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingProviderForm) {
        closeProviderModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProviderModalOpen, savingProviderForm]);

  const activeProviderCount = monitorSettings.providers.filter((provider) => provider.isEnabled).length;
  const customProviderCount = monitorSettings.providers.filter((provider) => !provider.isDefault).length;
  const currentProvider = current?.externalTarget ?? "No data";
  const isEditingProvider = editingProviderId !== null;
  const providerModalTitle = isEditingProvider ? "Edit custom provider" : "Add a custom provider";
  const providerModalDescription = isEditingProvider
    ? "Update the label, target, or hosted logo for this custom provider."
    : "Add a reliable IP or hostname and optionally point to a hosted logo image.";

  function resetCreateProviderForm(): void {
    setCustomLabel("");
    setCustomTarget("");
    setCustomLogoUrl("");
  }

  function openCreateProviderModal(): void {
    setEditingProviderId(null);
    resetCreateProviderForm();
    setIsProviderModalOpen(true);
  }

  function openEditProviderModal(provider: MonitorProviderRecord): void {
    setEditingProviderId(provider.id);
    setCustomLabel(provider.label);
    setCustomTarget(provider.target);
    setCustomLogoUrl(provider.logoUrl ?? "");
    setIsProviderModalOpen(true);
  }

  function closeProviderModal(): void {
    if (savingProviderForm) {
      return;
    }

    setEditingProviderId(null);
    setIsProviderModalOpen(false);
    resetCreateProviderForm();
  }

  async function handleRoundRobinToggle(): Promise<void> {
    try {
      setSavingRoundRobin(true);
      setError(null);
      const updatedSettings = await updateMonitorSettings({
        roundRobinEnabled: !monitorSettings.roundRobinEnabled
      });
      setMonitorSettings(updatedSettings);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the monitor settings."
      );
    } finally {
      setSavingRoundRobin(false);
    }
  }

  async function handleSubmitProviderForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      setSavingProviderForm(true);
      setError(null);
      const payload = {
        label: customLabel,
        target: customTarget,
        logoUrl: customLogoUrl
      };
      const updatedSettings = editingProviderId === null
        ? await createMonitorProvider(payload)
        : await updateMonitorProvider(editingProviderId, payload);
      setMonitorSettings(updatedSettings);
      setEditingProviderId(null);
      resetCreateProviderForm();
      setIsProviderModalOpen(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEditingProvider
            ? "Could not update the custom provider."
            : "Could not create the custom provider."
      );
    } finally {
      setSavingProviderForm(false);
    }
  }

  async function handleToggleProvider(provider: MonitorProviderRecord): Promise<void> {
    try {
      setPendingProviderId(provider.id);
      setError(null);
      const updatedSettings = await updateMonitorProvider(provider.id, {
        isEnabled: !provider.isEnabled
      });
      setMonitorSettings(updatedSettings);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update the provider."
      );
    } finally {
      setPendingProviderId(null);
    }
  }

  async function handleMoveProvider(providerId: number, direction: -1 | 1): Promise<void> {
    const index = monitorSettings.providers.findIndex((provider) => provider.id === providerId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= monitorSettings.providers.length) {
      return;
    }

    const reorderedProviders = [...monitorSettings.providers];
    const [movedProvider] = reorderedProviders.splice(index, 1);

    if (!movedProvider) {
      return;
    }

    reorderedProviders.splice(nextIndex, 0, movedProvider);

    try {
      setPendingProviderId(providerId);
      setError(null);
      const updatedSettings = await reorderMonitorProviders({
        providerIds: reorderedProviders.map((provider) => provider.id)
      });
      setMonitorSettings(updatedSettings);
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Could not reorder the providers."
      );
    } finally {
      setPendingProviderId(null);
    }
  }

  async function handleDeleteProvider(provider: MonitorProviderRecord): Promise<void> {
    try {
      setPendingProviderId(provider.id);
      setError(null);
      const updatedSettings = await deleteMonitorProvider(provider.id);
      setMonitorSettings(updatedSettings);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete the provider."
      );
    } finally {
      setPendingProviderId(null);
    }
  }

  return (
    <AppShell
      activePage="providers"
      onNavigate={onNavigate}
      topbarContent={
        <div className="dashboard-topbar__context">
          <span className="dashboard-topbar__context-mark" aria-hidden="true" />
          <span className="mono">PROVIDER CONTROL</span>
        </div>
      }
    >
      <main className="dashboard-content dashboard-content--providers">
        {error ? (
          <section className="error-banner">
            <span className="error-banner__label">Alert</span>
            <p>{error}</p>
          </section>
        ) : null}

        <section className="incident-overview">
          <article className="incident-overview__card">
            <span className="incident-overview__label">Active providers</span>
            <strong className="mono">{activeProviderCount}</strong>
            <p>Targets currently available for probing</p>
          </article>
          <article className="incident-overview__card">
            <span className="incident-overview__label">Mode</span>
            <strong className="mono">{getMonitorModeLabel(monitorSettings.roundRobinEnabled)}</strong>
            <p>Order drives both fallback and round robin rotation</p>
          </article>
          <article className="incident-overview__card">
            <span className="incident-overview__label">Current provider</span>
            <strong className="mono provider-overview__target">{currentProvider}</strong>
            <p>{customProviderCount} custom providers configured</p>
          </article>
        </section>

        <section className="control-bar">
          <div className="control-bar__actions">
            <div className="live-switch">
              <span className="live-switch__label mono">Round Robin</span>
              <button
                type="button"
                className={`live-switch__toggle${monitorSettings.roundRobinEnabled ? " is-active" : ""}`}
                aria-pressed={monitorSettings.roundRobinEnabled}
                aria-label="Toggle round robin providers"
                disabled={savingRoundRobin}
                onClick={() => void handleRoundRobinToggle()}
              >
                <span className="live-switch__thumb" />
              </button>
              <span className={`live-switch__value mono${monitorSettings.roundRobinEnabled ? " is-active" : ""}`}>
                {savingRoundRobin
                  ? "SAVING"
                  : monitorSettings.roundRobinEnabled
                    ? "ON"
                    : "OFF"}
              </span>
            </div>
          </div>
          <div className="control-bar__actions">
            <span className="incident-range-copy mono">Average ping window: 24h</span>
            <span className="control-bar__divider" aria-hidden="true" />
            <button
              type="button"
              className="control-bar__refresh mono"
              onClick={() => onNavigate("/")}
            >
              Back to dashboard
            </button>
          </div>
        </section>

        <section className="providers-form">
          <div className="providers-form__copy">
            <p className="eyebrow">Custom target</p>
            <h2>Add a custom provider</h2>
            <p>
              Add any reliable IP or hostname and optionally attach a logo URL. Default providers stay protected and cannot be deleted.
            </p>
          </div>
          <div className="providers-form__actions">
            <span className="providers-form__hint mono">Logo URL is optional</span>
            <button
              type="button"
              className="providers-form__submit"
              onClick={() => openCreateProviderModal()}
            >
              Add provider
            </button>
          </div>
        </section>

        <section className="providers-list-panel">
          <div className="providers-list-panel__header">
            <div>
              <p className="eyebrow">Ordered catalog</p>
              <h2>Provider list</h2>
            </div>
            <span className="mono providers-list-panel__count">
              {monitorSettings.providers.length} providers
            </span>
          </div>

          <div className="provider-panel__grid provider-panel__grid--management">
            {providerStats.map(
              ({ provider, averageLatencyMs, successfulProbeCount, isCurrentProvider }, index) => (
                <article
                  key={provider.id}
                  className={`provider-card${isCurrentProvider ? " is-current" : ""}${provider.isEnabled ? "" : " is-disabled"}`}
                >
                  <div className="provider-card__header">
                    <div className="provider-card__identity">
                      <ProviderLogo company={provider.company} logoUrl={provider.logoUrl} />
                      <div className="provider-card__identity-copy">
                        <strong>{provider.company ?? provider.label}</strong>
                        <span className="mono">{provider.target}</span>
                      </div>
                    </div>
                    <div className="provider-card__header-actions">
                      <span className={`provider-card__badge mono${isCurrentProvider ? " is-current" : ""}`}>
                        {isCurrentProvider ? "Current" : provider.isEnabled ? "Active" : "Inactive"}
                      </span>
                      {provider.isDefault ? (
                        <span className="provider-card__badge mono">Default</span>
                      ) : (
                        <div className="provider-card__icon-actions">
                          <button
                            type="button"
                            className="provider-card__icon-action"
                            aria-label={`Edit ${provider.label}`}
                            disabled={pendingProviderId === provider.id || savingProviderForm}
                            onClick={() => openEditProviderModal(provider)}
                          >
                            <Pencil aria-hidden="true" strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            className="provider-card__icon-action provider-card__icon-action--danger"
                            aria-label={`Delete ${provider.label}`}
                            disabled={pendingProviderId === provider.id || savingProviderForm}
                            onClick={() => void handleDeleteProvider(provider)}
                          >
                            <Trash2 aria-hidden="true" strokeWidth={1.8} />
                          </button>
                        </div>
                      )}
                    </div>
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
                    <div>
                      <dt>Order</dt>
                      <dd className="mono">#{index + 1}</dd>
                    </div>
                  </dl>

                  <div className="provider-card__controls">
                    <div className="provider-card__reorder">
                      <button
                        type="button"
                        className="provider-card__action"
                        disabled={pendingProviderId === provider.id || index === 0}
                        onClick={() => void handleMoveProvider(provider.id, -1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="provider-card__action"
                        disabled={
                          pendingProviderId === provider.id ||
                          index === monitorSettings.providers.length - 1
                        }
                        onClick={() => void handleMoveProvider(provider.id, 1)}
                      >
                        Move down
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`provider-card__action${provider.isEnabled ? " is-enabled" : ""}`}
                      disabled={pendingProviderId === provider.id}
                      onClick={() => void handleToggleProvider(provider)}
                    >
                      {pendingProviderId === provider.id
                        ? "Updating..."
                        : provider.isEnabled
                          ? "Disable"
                          : "Enable"}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        {isProviderModalOpen ? (
          <div
            className="provider-modal"
            role="presentation"
            onClick={() => closeProviderModal()}
          >
            <div
              className="provider-modal__dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="custom-provider-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="provider-modal__header">
                <div className="providers-form__copy">
                  <p className="eyebrow">Custom target</p>
                  <h2 id="custom-provider-modal-title">{providerModalTitle}</h2>
                  <p>{providerModalDescription}</p>
                </div>
                <button
                  type="button"
                  className="provider-modal__close"
                  aria-label="Close provider modal"
                  onClick={() => closeProviderModal()}
                >
                  Close
                </button>
              </div>

              <form
                className="provider-modal__form"
                onSubmit={(event) => void handleSubmitProviderForm(event)}
              >
                <label className="providers-form__field">
                  <span>Name</span>
                  <input
                    value={customLabel}
                    placeholder="Example: Internal Edge DNS"
                    onChange={(event) => setCustomLabel(event.target.value)}
                  />
                </label>
                <label className="providers-form__field">
                  <span>IP or hostname</span>
                  <input
                    value={customTarget}
                    placeholder="Example: 10.10.10.10 or resolver.example.com"
                    onChange={(event) => setCustomTarget(event.target.value)}
                  />
                </label>
                <label className="providers-form__field provider-modal__field--full">
                  <span>Logo URL</span>
                  <input
                    value={customLogoUrl}
                    placeholder="Example: https://assets.example.com/dns-logo.png"
                    onChange={(event) => setCustomLogoUrl(event.target.value)}
                  />
                </label>

                <div className="provider-modal__actions">
                  <button
                    type="button"
                    className="provider-card__action"
                    disabled={savingProviderForm}
                    onClick={() => closeProviderModal()}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="providers-form__submit"
                    disabled={savingProviderForm}
                  >
                    {savingProviderForm
                      ? isEditingProvider
                        ? "Saving..."
                        : "Adding..."
                      : isEditingProvider
                        ? "Save changes"
                        : "Create provider"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
