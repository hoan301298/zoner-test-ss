import { Injectable, Logger } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import {
  Observable,
  bufferTime,
  filter,
  groupBy,
  map,
  mergeMap,
  scan,
  shareReplay,
  startWith,
  withLatestFrom,
} from 'rxjs';
import { AlarmAcknowledgedEvent } from '../../domain/events/alarm-acknowledged.event';
import { AlarmCreatedEvent } from '../../domain/events/alarm-created.event';
import { NotifyFacilitySupervisorCommand } from '../commands/notify-facility-supervisor.command';

@Injectable()
export class CascadingAlarmsSaga {
  private readonly logger = new Logger(CascadingAlarmsSaga.name);

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

    return events$.pipe(
      ofType(AlarmCreatedEvent),
      groupBy((event) => event.alarm.name),
      mergeMap((groupedEvents$) =>
        groupedEvents$.pipe(
          bufferTime(5000, null, 4),
          withLatestFrom(acknowledgedIds$),
          filter(([events, acknowledgedIds]) => {
            
            // Check the alarm in acknowledgedIds (should not included)
            const activeAlarms = events.filter(
              (event) => !event.alarm.isAcknowledged && !acknowledgedIds.has(event.alarm.id),
            );

            const shouldEscalate = activeAlarms.length >= 3;
            
            if (!shouldEscalate) {
              this.logger.debug(
                `Buffer has ${activeAlarms.length} active alarms, not escalating (need 3+)`,
              );
            }
            
            return shouldEscalate;
          }),
          map(([events]) => {
            this.logger.debug(
              `Three unacknowledged alarms were triggered during 5 seconds`,
            );
            const facilityId = '54321';

            return new NotifyFacilitySupervisorCommand(
              facilityId,
              events.map((event) => event.alarm.id),
              events[events.length - 1]?.alarm['correlationId'],
            );
          }),
        ),
      ),
    );
  };
}
