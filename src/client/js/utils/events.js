import { Subject } from 'rxjs';
import { EventEmitter } from 'eventemitter3';

export default {
  _subjects: {},

  _getSubject: function (event) {
    if (this._subjects[event]) {
      return this._subjects[event];
    } else {
      this._subjects[event] = new Subject();
      return this._subjects[event];
    }
  },

  listenFor: function (event, cb) {
    return this._getSubject(event).subscribe({
      next: cb,
    });
  },

  emitEvent: function (event, data) {
    this._getSubject(event).next(data);
  },

  unsubscribe: function (sub) {
    sub.unsubscribe();
  },
};

export class SolCacheUpdateEvent {
  static type = 'CacheUpdate';
  constructor(id, isNew, parser) {
    this.id = id;
    this.parser = parser;
    this.isNew = isNew;
  }
}

export class SolCacheDeleteEvent {
  static type = 'CacheUpdate';
  constructor(id) {
    this.id = id;
  }
}

export class SolMarketUpdateEvent {
  static type = 'MarketUpdate';
  constructor(ids) {
    this.ids = ids;
  }
}

export class SolCacheClearEvent {
  static type = 'CacheDelete';
}

export class SolEventEmitter {
  constructor() {
    this.emitter = new EventEmitter();
  }
  onMarket(callback) {
    this.emitter.on(SolMarketUpdateEvent.type, callback);

    return () => this.emitter.removeListener(SolMarketUpdateEvent.type, callback);
  }

  onCache(callback) {
    this.emitter.on(SolCacheUpdateEvent.type, callback);

    return () => this.emitter.removeListener(SolCacheUpdateEvent.type, callback);
  }

  raiseMarketUpdated(ids) {
    this.emitter.emit(SolMarketUpdateEvent.type, new SolMarketUpdateEvent(ids));
  }

  raiseCacheUpdated(id, isNew, parser) {
    this.emitter.emit(SolCacheUpdateEvent.type, new SolCacheUpdateEvent(id, isNew, parser));
  }

  raiseCacheDeleted(id) {
    this.emitter.emit(SolCacheDeleteEvent.type, new SolCacheDeleteEvent(id));
  }

  raiseCacheCleared() {
    this.emitter.emit(SolCacheClearEvent.type, new SolCacheClearEvent());
  }
}
