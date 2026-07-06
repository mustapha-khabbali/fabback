import EventEmitter from 'events';

export const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(0);

export const REALTIME_EVENT = 'fablab:change';

export function emitRealtimeChange(change) {
  realtimeBus.emit(REALTIME_EVENT, {
    ...change,
    ts: new Date().toISOString()
  });
}
