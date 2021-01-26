"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockOperationStatus = exports.LockOperationType = void 0;
var LockOperationType;
(function (LockOperationType) {
    LockOperationType["Lock"] = "lock";
    LockOperationType["Unlock"] = "unlock";
})(LockOperationType = exports.LockOperationType || (exports.LockOperationType = {}));
;
var LockOperationStatus;
(function (LockOperationStatus) {
    LockOperationStatus["Pending"] = "pending";
    LockOperationStatus["Completed"] = "completed";
    LockOperationStatus["Timeout"] = "timeout";
    LockOperationStatus["Failed"] = "failed";
})(LockOperationStatus = exports.LockOperationStatus || (exports.LockOperationStatus = {}));
;
//# sourceMappingURL=glueCommandResp.js.map