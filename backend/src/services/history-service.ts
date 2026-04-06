import type { OutageIncident, TimelineSegment } from "../types/api";
import type { MonitorStateTransition, PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore, TransitionStore } from "../types/storage";

export class HistoryService {
  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly transitionRepository: TransitionStore,
    private readonly sampleIntervalSeconds: number
  ) {}

  public getHistory(from: number, to: number): PersistedMonitorSample[] {
    return this.repository.getRange(from, to);
  }

  public getTimelineSegments(from: number, to: number): TimelineSegment[] {
    if (from > to) {
      return [];
    }

    const transitions = this.transitionRepository.listRange(from, to);
    const previousTransition = this.transitionRepository.getLatestBeforeOrAt(Math.max(0, from - 1));
    const segments: TimelineSegment[] = [];

    let activeTransition = previousTransition;

    if (!activeTransition && transitions.length === 0) {
      return [];
    }

    for (const transition of transitions) {
      if (activeTransition) {
        const segment = this.buildTimelineSegment(activeTransition, transition.effectiveAt, from, to);

        if (segment) {
          segments.push(segment);
        }
      }

      activeTransition = transition;
    }

    if (activeTransition) {
      const segment = this.buildTimelineSegment(activeTransition, null, from, to);

      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  }

  public getIncidents(from: number, to: number): OutageIncident[] {
    const incidents: OutageIncident[] = [];
    let openIncidentStart: MonitorStateTransition | null = null;

    for (const transition of this.getRelevantTransitions(from, to)) {
      if (transition.status === "down") {
        openIncidentStart = transition;
        continue;
      }

      if (openIncidentStart) {
        incidents.push(this.buildIncident(openIncidentStart.effectiveAt, transition.effectiveAt, to));
        openIncidentStart = null;
      }
    }

    if (openIncidentStart) {
      incidents.push(this.buildIncident(openIncidentStart.effectiveAt, null, to));
    }

    return incidents;
  }

  private buildIncident(
    startedAt: number,
    resolvedAt: number | null,
    rangeEnd: number
  ): OutageIncident {
    const samples = this.repository
      .getRange(startedAt, resolvedAt ?? rangeEnd)
      .filter((sample) => sample.status === "down" && (resolvedAt === null || sample.observedAt < resolvedAt));

    if (samples.length === 0) {
      throw new Error("Cannot build an incident without samples");
    }

    const lastSample = samples[samples.length - 1]!;

    return {
      startedAt,
      lastObservedAt: lastSample.observedAt,
      resolvedAt,
      durationSeconds: resolvedAt === null
        ? lastSample.observedAt - startedAt + this.sampleIntervalSeconds
        : resolvedAt - startedAt,
      sampleCount: samples.length,
      externalTarget: lastSample.externalTarget,
      latestFailureReason: lastSample.failureReason,
      latestLatencyMs: lastSample.externalLatencyMs,
      status: resolvedAt === null ? "ongoing" : "resolved",
      samples
    };
  }

  private getRelevantTransitions(from: number, to: number): MonitorStateTransition[] {
    const transitions = this.transitionRepository.listRange(from, to);
    const previousTransition = this.transitionRepository.getLatestBeforeOrAt(Math.max(0, from - 1));

    if (
      previousTransition?.status === "down" &&
      transitions[0]?.id !== previousTransition.id
    ) {
      return [previousTransition, ...transitions];
    }

    return transitions;
  }

  private buildTimelineSegment(
    transition: MonitorStateTransition,
    nextTransitionAt: number | null,
    from: number,
    to: number
  ): TimelineSegment | null {
    const visibleStart = Math.max(transition.effectiveAt, from);
    const visibleEnd = Math.min(nextTransitionAt ?? to, to);

    if (visibleEnd < visibleStart) {
      return null;
    }

    if (visibleEnd === visibleStart && nextTransitionAt !== null) {
      return null;
    }

    const samples = this.repository
      .getRange(transition.effectiveAt, nextTransitionAt ?? to)
      .filter((sample) => nextTransitionAt === null || sample.observedAt < nextTransitionAt);
    const lastSample = samples[samples.length - 1] ?? null;

    return {
      status: transition.status,
      startedAt: transition.effectiveAt,
      endedAt: nextTransitionAt,
      visibleStart,
      visibleEnd,
      durationSeconds: Math.max(0, visibleEnd - visibleStart),
      sampleCount: samples.length,
      lastObservedAt: lastSample?.observedAt ?? null,
      latestFailureReason: lastSample?.failureReason ?? null,
      latestLatencyMs: lastSample?.externalLatencyMs ?? null,
      startedBeforeRange: transition.effectiveAt < from,
      endsAfterRange: nextTransitionAt === null || nextTransitionAt > to
    };
  }
}
