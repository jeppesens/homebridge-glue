"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiated = void 0;
function initiated(_target, _propertyName, 
// eslint-disable-next-line @typescript-eslint/ban-types
descriptor) {
    const method = descriptor.value;
    descriptor.value = function () {
        if (!!this._apiKey && !!this.lockID)
            return method.apply(this, arguments);
        else
            return Promise.reject(new Error('Not initiated yet'));
    };
}
exports.initiated = initiated;
//# sourceMappingURL=decorators.js.map