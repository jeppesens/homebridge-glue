"use strict";
// import { Characteristic } from 'homebridge';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockEventsEnum = exports.HomebridgeLockStatus = void 0;
var HomebridgeLockStatus;
(function (HomebridgeLockStatus) {
    HomebridgeLockStatus[HomebridgeLockStatus["UNSECURED"] = 0] = "UNSECURED";
    HomebridgeLockStatus[HomebridgeLockStatus["SECURED"] = 1] = "SECURED";
    HomebridgeLockStatus[HomebridgeLockStatus["UNKNOWN"] = 3] = "UNKNOWN";
})(HomebridgeLockStatus = exports.HomebridgeLockStatus || (exports.HomebridgeLockStatus = {}));
var LockEventsEnum;
(function (LockEventsEnum) {
    LockEventsEnum[LockEventsEnum["unknown"] = 3] = "unknown";
    LockEventsEnum[LockEventsEnum["localLock"] = 1] = "localLock";
    LockEventsEnum[LockEventsEnum["localUnlock"] = 0] = "localUnlock";
    LockEventsEnum[LockEventsEnum["remoteLock"] = 1] = "remoteLock";
    LockEventsEnum[LockEventsEnum["remoteUnlock"] = 0] = "remoteUnlock";
    LockEventsEnum[LockEventsEnum["pressAndGo"] = 1] = "pressAndGo";
    LockEventsEnum[LockEventsEnum["manualUnlock"] = 0] = "manualUnlock";
    LockEventsEnum[LockEventsEnum["manualLock"] = 1] = "manualLock";
})(LockEventsEnum = exports.LockEventsEnum || (exports.LockEventsEnum = {}));
;
//# sourceMappingURL=index.js.map