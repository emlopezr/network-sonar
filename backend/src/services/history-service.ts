import type { OutageIncident, TimelineSegment } from "../types/api";
import type { MonitorStateTransition, PersistedMonitorSample } from "../types/monitor";
import type { ConnectionLogStore, TransitionStore } from "../types/storage";

export class HistoryService {
  public constructor(
    private readonly repository: ConnectionLogStore,
    private readonly transitionRepository: TransitionStore,
    private readonly sampleIntervalSeconds: number,
    private readonly noDataAfterSeconds: number
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
    const gapThresholdSeconds = this.noDataAfterSeconds;

    let activeTransition = previousTransition;

    if (!activeTransition && transitions.length === 0) {
      return [];
    }

    for (const transition of transitions) {
      if (activeTransition) {
        segments.push(
          ...this.buildTimelineSegments(
            activeTransition,
            transition.effectiveAt,
            from,
            to,
            gapThresholdSeconds
          )
        );
      }

      activeTransition = transition;
    }

    if (activeTransition) {
      segments.push(
        ...this.buildTimelineSegments(activeTransition, null, from, to, gapThresholdSeconds)
      );
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

  private buildTimelineSegments(
    transition: MonitorStateTransition,
    nextTransitionAt: number | null,
    from: number,
    to: number,
    gapThresholdSeconds: number
  ): TimelineSegment[] {
    const samples = this.repository
      .getRange(transition.effectiveAt, nextTransitionAt ?? to)
      .filter((sample) => nextTransitionAt === null || sample.observedAt < nextTransitionAt);
    const segments: TimelineSegment[] = [];
    const isOpenTransition = nextTransitionAt === null;

    if (samples.length === 0) {
      const fallbackSegment = this.buildSingleTimelineSegment(
        transition.status,
        transition.effectiveAt,
        isOpenTransition ? null : nextTransitionAt,
        from,
        to,
        0,
        null
      );

      return fallbackSegment ? [fallbackSegment] : [];
    }

    let segmentCursor = transition.effectiveAt;
    let segmentSamples: PersistedMonitorSample[] = [];

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]!;
      const nextSample = samples[index + 1] ?? null;
      segmentSamples.push(sample);

      const gapToNextSample = nextSample ? nextSample.observedAt - sample.observedAt : null;
      const hasNoDataGap = gapToNextSample !== null && gapToNextSample > gapThresholdSeconds;

      if (hasNoDataGap) {
        const stateSegment = this.buildSingleTimelineSegment(
          transition.status,
          segmentCursor,
          sample.observedAt + this.sampleIntervalSeconds,
          from,
          to,
          segmentSamples.length,
          segmentSamples[segmentSamples.length - 1] ?? null
        );

        if (stateSegment) {
          segments.push(stateSegment);
        }

        const noDataStart = sample.observedAt + this.sampleIntervalSeconds;
        const noDataSegment = this.buildSingleTimelineSegment(
          "no_data",
          noDataStart,
          nextSample!.observedAt,
          from,
          to,
          0,
          null
        );

        if (noDataSegment) {
          segments.push(noDataSegment);
        }

        segmentCursor = nextSample!.observedAt;
        segmentSamples = [];
      }
    }

    const lastSample = samples[samples.length - 1]!;
    const nominalSegmentEnd = nextTransitionAt ?? to;
    const trailingGapStart = lastSample.observedAt + this.sampleIntervalSeconds;
    const hasTrailingNoData =
      trailingGapStart <= nominalSegmentEnd &&
      nominalSegmentEnd - lastSample.observedAt > gapThresholdSeconds;
    const finalStateEndedAt = hasTrailingNoData ? trailingGapStart : nextTransitionAt;

    const finalStateSegment = this.buildSingleTimelineSegment(
      transition.status,
      segmentCursor,
      finalStateEndedAt,
      from,
      to,
      segmentSamples.length,
      segmentSamples[segmentSamples.length - 1] ?? null
    );

    if (finalStateSegment) {
      segments.push(finalStateSegment);
    }

    if (hasTrailingNoData) {
      const trailingNoData = this.buildSingleTimelineSegment(
        "no_data",
        trailingGapStart,
        nextTransitionAt,
        from,
        to,
        0,
        null
      );

      if (trailingNoData) {
        segments.push(trailingNoData);
      }
    }

    return segments;
  }

  private buildSingleTimelineSegment(
    status: TimelineSegment["status"],
    startedAt: number,
    endedAt: number | null,
    from: number,
    to: number,
    sampleCount: number,
    lastSample: PersistedMonitorSample | null
  ): TimelineSegment | null {
    const visibleStart = Math.max(startedAt, from);
    const visibleEnd = Math.min(endedAt ?? to, to);

    if (visibleEnd < visibleStart) {
      return null;
    }

    if (visibleEnd === visibleStart && endedAt !== null) {
      return null;
    }

    return {
      status,
      startedAt,
      endedAt,
      visibleStart,
      visibleEnd,
      durationSeconds: Math.max(0, visibleEnd - visibleStart),
      sampleCount,
      lastObservedAt: lastSample?.observedAt ?? null,
      latestFailureReason: lastSample?.failureReason ?? null,
      latestLatencyMs: lastSample?.externalLatencyMs ?? null,
      startedBeforeRange: startedAt < from,
      endsAfterRange: endedAt === null || endedAt > to
    };
  }
}
