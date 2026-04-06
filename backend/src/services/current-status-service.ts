import {
  advanceConfirmedState,
  buildSnapshot,
  resetPendingState,
  type ConfirmedMonitorState
} from "./confirmed-state-machine";
import type {
  ConfirmationThresholds,
  CurrentStatusSnapshot,
  MonitorSensitivityRevision,
  PersistedMonitorSample
} from "../types/monitor";
import type {
  ConnectionLogStore,
  MonitorSettingsStoreReader,
  TransitionStore
} from "../types/storage";

function thresholdsEqual(
  left: ConfirmationThresholds | null,
  right: ConfirmationThresholds
): boolean {
  return (
    left?.confirmDownAfter === right.confirmDownAfter &&
    left?.confirmUpAfter === right.confirmUpAfter
  );
}

function toThresholds(
  revision: MonitorSensitivityRevision | ConfirmationThresholds
): ConfirmationThresholds {
  return {
    confirmDownAfter: revision.confirmDownAfter,
    confirmUpAfter: revision.confirmUpAfter
  };
}

export class CurrentStatusService {
  private currentState: ConfirmedMonitorState | null = null;

  private activeThresholds: ConfirmationThresholds | null = null;

  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly transitionRepository: TransitionStore,
    private readonly settingsReader: MonitorSettingsStoreReader,
    private readonly staleAfterSeconds: number
  ) {}

  public hydrate(): void {
    const replay = this.replay(this.repository.getAll(), this.settingsReader.listSensitivityRevisions());

    this.currentState = replay.state;
    this.activeThresholds = replay.activeThresholds;
    this.transitionRepository.replaceAll(replay.transitions);
  }

  public update(
    sample: PersistedMonitorSample,
    thresholds: ConfirmationThresholds
  ): CurrentStatusSnapshot {
    if (this.currentState && !thresholdsEqual(this.activeThresholds, thresholds)) {
      this.currentState = resetPendingState(this.currentState);
    }

    const result = advanceConfirmedState(this.currentState, sample, thresholds);
    this.currentState = result.state;
    this.activeThresholds = thresholds;

    if (result.transition) {
      this.transitionRepository.insert(result.transition);
    }

    return this.getCurrentSnapshot(sample.observedAt);
  }

  public getCurrentSnapshot(now = Math.floor(Date.now() / 1000)): CurrentStatusSnapshot {
    return buildSnapshot(this.currentState, this.staleAfterSeconds, now);
  }

  private replay(
    samples: PersistedMonitorSample[],
    revisions: MonitorSensitivityRevision[]
  ): {
    state: ConfirmedMonitorState | null;
    activeThresholds: ConfirmationThresholds;
    transitions: Array<{
      status: PersistedMonitorSample["status"];
      effectiveAt: number;
      confirmedAt: number;
    }>;
  } {
    const currentSettings = this.settingsReader.getSettings();
    let state: ConfirmedMonitorState | null = null;
    let revisionIndex = 0;
    let activeThresholds = revisions[0]
      ? toThresholds(revisions[0])
      : {
          confirmDownAfter: currentSettings.confirmDownAfter,
          confirmUpAfter: currentSettings.confirmUpAfter
        };
    const transitions: Array<{
      status: PersistedMonitorSample["status"];
      effectiveAt: number;
      confirmedAt: number;
    }> = [];

    for (const sample of samples) {
      while (
        revisionIndex + 1 < revisions.length &&
        revisions[revisionIndex + 1]!.effectiveAt <= sample.observedAt
      ) {
        revisionIndex += 1;
        activeThresholds = toThresholds(revisions[revisionIndex]!);

        if (state) {
          state = resetPendingState(state);
        }
      }

      const result = advanceConfirmedState(state, sample, activeThresholds);
      state = result.state;

      if (result.transition) {
        transitions.push(result.transition);
      }
    }

    const latestThresholds = {
      confirmDownAfter: currentSettings.confirmDownAfter,
      confirmUpAfter: currentSettings.confirmUpAfter
    };

    if (state && !thresholdsEqual(activeThresholds, latestThresholds)) {
      state = resetPendingState(state);
    }

    return {
      state,
      activeThresholds: latestThresholds,
      transitions
    };
  }
}
