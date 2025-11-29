import { Injectable, Logger } from '@nestjs/common';
import { Saga, ICommand, ofType } from '@nestjs/cqrs';
import {
  EMPTY,
  Observable,
  filter,
  first,
  map,
  merge,
  mergeMap,
  race,
  scan,
  shareReplay,
  startWith,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';
import { AlarmAcknowledgedEvent } from '../../domain/events/alarm-acknowledged.event';
import { AlarmCreatedEvent } from '../../domain/events/alarm-created.event';
import { NotifyFacilitySupervisorCommand } from '../commands/notify-facility-supervisor.command';

@Injectable()
export class UnacknowledgedAlarmsSaga {
  private readonly logger = new Logger(UnacknowledgedAlarmsSaga.name);

  @Saga()
  start = (events$: Observable<any>): Observable<ICommand> => {
    // Track all acknowledged alarm IDs
    const acknowledgedIds$ = events$.pipe(
      ofType(AlarmAcknowledgedEvent),
      scan((acc: Set<string>, event) => {
        acc.add(event.alarmId);
        return acc;
      }, new Set<string>()),
      startWith(new Set<string>()),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    // Track all alarms by name (independent subscription)
    const alarmsByName$ = events$.pipe(
      ofType(AlarmCreatedEvent),
      tap((event) => {
        this.logger.debug(`[alarmsByName tap] Received AlarmCreatedEvent for ${event.alarm.id}`);
      }),
      scan((acc: Map<string, Set<string>>, event) => {
        const name = event.alarm.name;
        if (!acc.has(name)) {
          acc.set(name, new Set());
        }
        acc.get(name)!.add(event.alarm.id);
        this.logger.debug(`[scan] Added ${event.alarm.id} to ${name}, now has: [${Array.from(acc.get(name)!).join(',')}]`);
        return acc;
      }, new Map<string, Set<string>>()),
      startWith(new Map<string, Set<string>>()),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    // Force subscription to alarmsByName$ so scan accumulates
    alarmsByName$.subscribe();

    return events$.pipe(
      ofType(AlarmCreatedEvent),
      mergeMap((alarmCreatedEvent) => {
        const alarmId = alarmCreatedEvent.alarm.id;
        const alarmName = alarmCreatedEvent.alarm.name;

        return race(
          events$.pipe(
            ofType(AlarmAcknowledgedEvent),
            filter(
              (alarmAcknowledgedEvent) =>
                alarmAcknowledgedEvent.alarmId === alarmId,
            ),
            first(),
            mergeMap(() => EMPTY),
          ),
          timer(15000).pipe(
            withLatestFrom(acknowledgedIds$, alarmsByName$),
            filter(([_, acknowledgedIds, alarmsByName]) => {
              const isNotAcknowledged = !acknowledgedIds.has(alarmId);

              // Check if there are 3+ alarms with the same name
              const allAlarmsWithName = Array.from(alarmsByName.get(alarmName) || []);
              const totalCount = allAlarmsWithName.length;
              
              // Count unacknowledged alarms in this group
              const unacknowledgedCount = allAlarmsWithName.filter(
                (id) => !acknowledgedIds.has(id),
              ).length;
              
              // Suppress escalation only if:
              // 1. There are 3+ total alarms AND
              // 2. There are 2+ unacknowledged alarms (potential cascade for CascadingAlarmsSaga)
              const isPartOfPotentialCascade = totalCount >= 3 && unacknowledgedCount >= 2;

              this.logger.debug(
                `[${alarmId}] Timer fired: acknowledged=${!isNotAcknowledged}, totalCount=${totalCount}, unacknowledgedCount=${unacknowledgedCount}, allAlarms=[${allAlarmsWithName.join(',')}], isPartOfPotentialCascade=${isPartOfPotentialCascade}, shouldEmit=${isNotAcknowledged && !isPartOfPotentialCascade}`,
              );

              return isNotAcknowledged && !isPartOfPotentialCascade;
            }),
            map(([_]) => alarmCreatedEvent),
          ),
        );
      }),
      map((alarmCreatedEvent) => {
        this.logger.debug(
          `Warning! Alarm "${alarmCreatedEvent.alarm.name}" not acknowledged in 15 seconds!`,
        );

        const facilityId = '54321';
        return new NotifyFacilitySupervisorCommand(facilityId, [
          alarmCreatedEvent.alarm.id,
        ]);
      }),
    );
  };
}