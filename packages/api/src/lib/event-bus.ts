import { Injectable } from '@nestjs/common';
import { Module, Global } from '@nestjs/common';

export interface EventPayload {
  [key: string]: any;
}

export type EventHandler = (payload: EventPayload) => Promise<void> | void;

@Injectable()
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(topic: string, handler: EventHandler): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
  }

  publish(topic: string, payload: EventPayload): void {
    console.log(`[EventBus] ${topic}:`, JSON.stringify(payload, null, 2));
    
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${topic}:`, error);
        }
      });
    }
  }
}

@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class LibModule {} 