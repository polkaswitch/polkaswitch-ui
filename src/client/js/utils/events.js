import { Subject } from 'rxjs';

export default {
  _subjects: {},

  _getSubject(event) {
    if (this._subjects[event]) {
      return this._subjects[event];
    }
    this._subjects[event] = new Subject();
    return this._subjects[event];
  },

  listenFor(event, cb) {
    return this._getSubject(event).subscribe({
      next: cb,
    });
  },

  emitEvent(event, data) {
    this._getSubject(event).next(data);
  },

  unsubscribe(sub) {
    sub.unsubscribe();
  },
};
