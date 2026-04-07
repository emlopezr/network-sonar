import type {
  ConfirmationThresholds
} from "../types/monitor";
import type {
  CreateMonitorProviderRequest,
  MonitorProviderRecord,
  MonitorProviderSeed,
  MonitorSettings,
  ReorderMonitorProvidersRequest,
  UpdateMonitorSettingsRequest,
  UpdateMonitorProviderRequest
} from "../types/api";
import type {
  DefaultProviderBootstrap,
  MonitorSettingsRepository
} from "../data/monitor-settings-repository";
import { monitorProviderCatalog } from "./monitor-provider-catalog";
import {
  normalizeOptionalLogoUrl,
  normalizeProviderLabel,
  normalizeProviderTarget
} from "./monitor-provider-validation";
import type { MonitorEventBus } from "./event-bus";

export class MonitorSettingsError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export class MonitorSettingsService {
  public constructor(
    private readonly repository: MonitorSettingsRepository,
    private readonly eventBus: MonitorEventBus,
    private readonly initialTargets: string[],
    private readonly initialRoundRobinEnabled: boolean,
    private readonly initialThresholds: ConfirmationThresholds,
    private readonly availableProviders: MonitorProviderSeed[] = monitorProviderCatalog
  ) {}

  public initialize(): void {
    this.repository.initialize(
      this.initialRoundRobinEnabled,
      this.initialThresholds,
      this.buildDefaultBootstrap()
    );
  }

  public getSettings(): MonitorSettings {
    const settings = this.repository.getSettings();

    return {
      roundRobinEnabled: settings.roundRobinEnabled,
      confirmDownAfter: settings.confirmDownAfter,
      confirmUpAfter: settings.confirmUpAfter,
      providers: this.repository.listProviders()
    };
  }

  public getThresholds(): ConfirmationThresholds {
    const settings = this.repository.getSettings();

    return {
      confirmDownAfter: settings.confirmDownAfter,
      confirmUpAfter: settings.confirmUpAfter
    };
  }

  public updateSettings(
    patch: UpdateMonitorSettingsRequest,
    effectiveAt = Math.floor(Date.now() / 1000)
  ): MonitorSettings {
    const current = this.repository.getSettings();
    const nextSettings = {
      roundRobinEnabled: patch.roundRobinEnabled ?? current.roundRobinEnabled,
      confirmDownAfter: patch.confirmDownAfter ?? current.confirmDownAfter,
      confirmUpAfter: patch.confirmUpAfter ?? current.confirmUpAfter,
      isPaused: current.isPaused
    };

    this.repository.updateSettings(nextSettings);

    if (
      nextSettings.confirmDownAfter !== current.confirmDownAfter ||
      nextSettings.confirmUpAfter !== current.confirmUpAfter
    ) {
      this.repository.addSensitivityRevision(effectiveAt, {
        confirmDownAfter: nextSettings.confirmDownAfter,
        confirmUpAfter: nextSettings.confirmUpAfter
      });
    }

    return this.publishAndReturnSettings();
  }

  public createCustomProvider(request: CreateMonitorProviderRequest): MonitorSettings {
    const label = normalizeProviderLabel(request.label);
    const target = normalizeProviderTarget(request.target);
    const logoUrl = normalizeOptionalLogoUrl(request.logoUrl);

    if (this.repository.getProviderByTarget(target)) {
      throw new MonitorSettingsError("Target already exists.", 409);
    }

    this.repository.createCustomProvider(label, target, logoUrl, true);
    return this.publishAndReturnSettings();
  }

  public updateProvider(id: number, request: UpdateMonitorProviderRequest): MonitorSettings {
    const provider = this.requireProvider(id);

    const isEditingDetails =
      request.label !== undefined ||
      request.target !== undefined ||
      request.logoUrl !== undefined;

    if (isEditingDetails) {
      if (provider.isDefault || provider.kind === "default") {
        throw new MonitorSettingsError("Default providers cannot be edited.", 400);
      }

      const label = request.label !== undefined
        ? normalizeProviderLabel(request.label)
        : provider.label;
      const target = request.target !== undefined
        ? normalizeProviderTarget(request.target)
        : provider.target;
      const logoUrl = request.logoUrl !== undefined
        ? normalizeOptionalLogoUrl(request.logoUrl)
        : provider.logoUrl;

      const existingProvider = this.repository.getProviderByTarget(target);

      if (existingProvider && existingProvider.id !== id) {
        throw new MonitorSettingsError("Target already exists.", 409);
      }

      this.repository.updateCustomProvider(id, label, target, logoUrl);
    }

    if (request.isEnabled !== undefined && request.isEnabled !== provider.isEnabled) {
      if (!request.isEnabled && this.getEnabledProviderCount() <= 1) {
        throw new MonitorSettingsError("At least one provider must stay active.", 400);
      }

      this.repository.updateProviderEnabled(id, request.isEnabled);
    }

    return this.publishAndReturnSettings();
  }

  public reorderProviders(request: ReorderMonitorProvidersRequest): MonitorSettings {
    const providers = this.repository.listProviders();
    const currentIds = providers.map((provider) => provider.id).sort((left, right) => left - right);
    const nextIds = [...request.providerIds].sort((left, right) => left - right);

    if (
      currentIds.length !== nextIds.length ||
      currentIds.some((id, index) => id !== nextIds[index])
    ) {
      throw new MonitorSettingsError("providerIds must contain every provider exactly once.", 400);
    }

    this.repository.reorderProviders(request.providerIds);
    return this.publishAndReturnSettings();
  }

  public deleteProvider(id: number): MonitorSettings {
    const provider = this.requireProvider(id);

    if (provider.isDefault || provider.kind === "default") {
      throw new MonitorSettingsError("Default providers cannot be deleted.", 400);
    }

    if (provider.isEnabled && this.getEnabledProviderCount() <= 1) {
      throw new MonitorSettingsError("At least one provider must stay active.", 400);
    }

    this.repository.deleteProvider(id);
    return this.publishAndReturnSettings();
  }

  private publishAndReturnSettings(): MonitorSettings {
    const settings = this.getSettings();
    this.eventBus.publishSettings(settings);
    return settings;
  }

  private requireProvider(id: number): MonitorProviderRecord {
    const provider = this.repository.getProviderById(id);

    if (!provider) {
      throw new MonitorSettingsError("Provider not found.", 404);
    }

    return provider;
  }

  private getEnabledProviderCount(): number {
    return this.repository.listProviders().filter((provider) => provider.isEnabled).length;
  }

  private buildDefaultBootstrap(): DefaultProviderBootstrap[] {
    const initialTargetSet = new Set(this.initialTargets);
    const orderedTargets = [
      ...this.initialTargets,
      ...this.availableProviders.map((provider) => provider.target)
    ];
    const dedupedTargets = [...new Set(orderedTargets)];

    return dedupedTargets
      .map((target, index) => {
        const provider = this.availableProviders.find((candidate) => candidate.target === target);

        if (!provider) {
          return null;
        }

        return {
          label: provider.label,
          target: provider.target,
          company: provider.company,
          isEnabled: initialTargetSet.has(provider.target),
          sortOrder: index
        } satisfies DefaultProviderBootstrap;
      })
      .filter((provider): provider is DefaultProviderBootstrap => provider !== null);
  }
}
