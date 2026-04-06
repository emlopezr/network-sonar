import type {
  ConfirmationThresholds,
  CurrentStatusSnapshot,
  MonitorStatus,
  PersistedMonitorSample
} from "../types/monitor";

export interface ConfirmedStateTransitionCandidate {
  status: MonitorStatus;
  effectiveAt: number;
  confirmedAt: number;
}

export interface ConfirmedMonitorState {
  latestObservedAt: number;
  status: MonitorStatus;
  confirmedSample: PersistedMonitorSample;
  lastChangeAt: number;
  pendingStatus: MonitorStatus | null;
  pendingCount: number;
  pendingStartedAt: number;
}

export interface AdvanceConfirmedStateResult {
  state: ConfirmedMonitorState;
  transition: ConfirmedStateTransitionCandidate | null;
}

function getConfirmationThreshold(
  status: MonitorStatus,
  thresholds: ConfirmationThresholds
): number {
  return status === "down" ? thresholds.confirmDownAfter : thresholds.confirmUpAfter;
}

export function resetPendingState(state: ConfirmedMonitorState): ConfirmedMonitorState {
  return {
    ...state,
    pendingStatus: null,
    pendingCount: 0,
    pendingStartedAt: 0
  };
}

export function advanceConfirmedState(
  currentState: ConfirmedMonitorState | null,
  sample: PersistedMonitorSample,
  thresholds: ConfirmationThresholds
): AdvanceConfirmedStateResult {
  if (!currentState) {
    return {
      state: {
        latestObservedAt: sample.observedAt,
        status: sample.status,
        confirmedSample: sample,
        lastChangeAt: sample.observedAt,
        pendingStatus: null,
        pendingCount: 0,
        pendingStartedAt: 0
      },
      transition: {
        status: sample.status,
        effectiveAt: sample.observedAt,
        confirmedAt: sample.observedAt
      }
    };
  }

  if (sample.status === currentState.status) {
    return {
      state: {
        latestObservedAt: sample.observedAt,
        status: currentState.status,
        confirmedSample: sample,
        lastChangeAt: currentState.lastChangeAt,
        pendingStatus: null,
        pendingCount: 0,
        pendingStartedAt: 0
      },
      transition: null
    };
  }

  const pendingStatus = currentState.pendingStatus === sample.status
    ? currentState.pendingStatus
    : sample.status;
  const pendingCount = currentState.pendingStatus === sample.status
    ? currentState.pendingCount + 1
    : 1;
  const pendingStartedAt = currentState.pendingStatus === sample.status
    ? currentState.pendingStartedAt
    : sample.observedAt;
  const requiredCount = getConfirmationThreshold(sample.status, thresholds);

  if (pendingCount < requiredCount) {
    return {
      state: {
        latestObservedAt: sample.observedAt,
        status: currentState.status,
        confirmedSample: currentState.confirmedSample,
        lastChangeAt: currentState.lastChangeAt,
        pendingStatus,
        pendingCount,
        pendingStartedAt
      },
      transition: null
    };
  }

  return {
    state: {
      latestObservedAt: sample.observedAt,
      status: sample.status,
      confirmedSample: sample,
      lastChangeAt: pendingStartedAt,
      pendingStatus: null,
      pendingCount: 0,
      pendingStartedAt: 0
    },
    transition: {
      status: sample.status,
      effectiveAt: pendingStartedAt,
      confirmedAt: sample.observedAt
    }
  };
}

export function buildSnapshot(
  state: ConfirmedMonitorState | null,
  staleAfterSeconds: number,
  now = Math.floor(Date.now() / 1000)
): CurrentStatusSnapshot {
  if (!state) {
    return {
      observedAt: 0,
      status: "stale",
      externalTarget: "",
      externalOk: false,
      externalLatencyMs: null,
      failureReason: null,
      staleAfterSeconds,
      lastChangeAt: 0
    };
  }

  const isStale = now - state.latestObservedAt > staleAfterSeconds;

  return {
    observedAt: state.latestObservedAt,
    status: isStale ? "stale" : state.status,
    externalTarget: state.confirmedSample.externalTarget,
    externalOk: state.confirmedSample.externalOk,
    externalLatencyMs: state.confirmedSample.externalLatencyMs,
    failureReason: state.confirmedSample.failureReason,
    staleAfterSeconds,
    lastChangeAt: state.lastChangeAt
  };
}
