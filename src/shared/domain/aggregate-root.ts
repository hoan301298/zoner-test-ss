import { AggregateRoot } from '@nestjs/cqrs';
import { Version } from './value-objects/version';
import { SerializableEvent } from './interfaces/serializable-event';

const VERSION = Symbol('version');

export class VersionedAggregateRoot extends AggregateRoot {
  public id: string;

  private [VERSION] = new Version(0);

  get version(): Version {
    return this[VERSION];
  }

  public loadFromHistory(history: SerializableEvent[]): void {
    history.forEach((event) => {
      // Use the auto-event handler discovery from NestJS CQRS
      const eventType = event.type;
      const eventPayload = event.data;
      
      // Manually call the appropriate event handler method
      const handlerMethod = `on${eventType}`;
      if (typeof (this as any)[handlerMethod] === 'function') {
        (this as any)[handlerMethod](eventPayload);
      }
      
      // Also apply the event to the aggregate root for auto-publishing (if needed)
      this.apply(eventPayload, true); // true to skip auto-publish during replay
    });

    const lastEvent = history[history.length - 1];
    this.setVersion(new Version(lastEvent.position));
  }

  private setVersion(version: Version): void {
    this[VERSION] = version;
  }
}
