"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const enum_1 = require("./enum");
const axios_1 = require("axios");
const interface_1 = require("./interface");
const helpers_1 = require("./helpers");
let hap;
function default_1(homebridge) {
    hap = homebridge.hap;
    homebridge.registerAccessory('homebridge-glue', 'glue-lock', LockAccessory);
}
exports.default = default_1;
class LockAccessory {
    constructor(log, config) {
        this.log = log;
        this.config = config;
        this.lockService = new hap.Service.LockMechanism(this.name);
        this.batteryService = new hap.Service.BatteryService(this.name);
        if (this.config['api-key'])
            this._apiKey = this.config['api-key'];
        else if (!this.config.username || !this.config.password)
            throw new Error('Config requires api-key or a username and password');
        this.lockID = config['lock-id'];
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.init();
    }
    get name() {
        return this.config.name || 'Glue Lock';
    }
    get client() {
        if (!this._client) {
            const client = axios_1.default.create({
                baseURL: 'https://user-api.gluehome.com',
                timeout: 60000,
            });
            client.interceptors.request.use(config => {
                this.log.debug(`making ${config.method} to ${config.url} with request body ${config.data ? JSON.stringify(config.data, null, 2) : null}`);
                if (!this._apiKey || config.url.match('/v1/api-keys'))
                    config.auth = { username: this.config.username, password: this.config.password };
                else
                    config.headers.authorization = `Api-Key ${this._apiKey}`;
                return config;
            }, error => {
                this.log.debug(error);
                return Promise.reject(error);
            });
            client.interceptors.response.use(resp => {
                this.log.debug(`Resp ${JSON.stringify(resp.data, null, 2)}`);
                return resp;
            }, error => {
                var _a;
                this.log.debug(error.response);
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401)
                    process.kill(1);
                return Promise.reject(error);
            });
            this._client = client;
        }
        return this._client;
    }
    get lastEvent() {
        var _a, _b;
        return ((_b = (_a = this.lock) === null || _a === void 0 ? void 0 : _a.lastLockEvent) === null || _b === void 0 ? void 0 : _b.eventTime) ? new Date(this.lock.lastLockEvent.eventTime) : new Date(0);
    }
    set lock(lock) {
        this.log.debug(`Setting lock to ${JSON.stringify(lock, null, 2)}`);
        if (lock.lastLockEvent && new Date(lock.lastLockEvent.eventTime) > this.lastEvent) {
            this._lock = lock;
            this.targetState = undefined;
            this.lockService.setCharacteristic(hap.Characteristic.LockCurrentState, this.currentState);
            if (this.lock.batteryStatus)
                this.batteryService.setCharacteristic(hap.Characteristic.BatteryLevel, this.lock.batteryStatus);
            this.log.debug(`Set the lock to ${JSON.stringify(lock, null, 2)}`);
        }
    }
    get lock() {
        return this._lock;
    }
    getTargetState() {
        return this.targetState;
    }
    getServices() {
        return [this.lockService, this.batteryService];
    }
    getCharging(callback) {
        callback(null, hap.Characteristic.ChargingState.NOT_CHARGING);
    }
    getState(callback) {
        var _a, _b;
        let state;
        switch ((_b = (_a = this.lock) === null || _a === void 0 ? void 0 : _a.lastLockEvent) === null || _b === void 0 ? void 0 : _b.eventType) {
            case 'pressAndGo':
            case 'localLock':
            case 'manualLock':
            case 'remoteLock':
                state = hap.Characteristic.LockCurrentState.SECURED;
                break;
            case 'localUnlock':
            case 'manualUnlock':
            case 'remoteUnlock':
                state = hap.Characteristic.LockCurrentState.UNSECURED;
                break;
            case 'unknown':
            default:
                state = hap.Characteristic.LockCurrentState.UNKNOWN;
        }
        callback(null, state);
    }
    get currentState() {
        let val;
        this.getState((err, vals) => {
            val = vals;
        });
        return val;
    }
    getBattery(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getBatteryLevel()
                .then(batteryLevel => callback(null, batteryLevel))
                .catch(err => callback(err));
        });
    }
    getLowBattery(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getBatteryLevel()
                .then(batteryLevel => (batteryLevel >= 20) ? hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
                .then(lowBattery => callback(null, lowBattery))
                .catch(err => callback(err));
        });
    }
    setState(command, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.targetState = command;
            this.log.debug(`Set state to ${command === enum_1.HomebridgeLockStatus.UNSECURED ? 'unlocked' : 'locked'}`);
            let callbackCalled = false;
            const onSuccessfulChange = () => {
                if (callbackCalled)
                    return;
                this.lock = {
                    lastLockEvent: {
                        eventTime: new Date().toISOString(),
                        eventType: command ? 'remoteLock' : 'remoteUnlock',
                    }
                };
                callback(null);
                callbackCalled = true;
            };
            yield this.client.post(`/v1/locks/${this.lockID}/operations`, {
                type: command === enum_1.HomebridgeLockStatus.UNSECURED ? interface_1.LockOperationType.Unlock : interface_1.LockOperationType.Lock,
            })
                .then(resp => resp.data)
                .then(({ status, id }) => __awaiter(this, void 0, void 0, function* () {
                if (status === interface_1.LockOperationStatus.Completed) { // Success
                    onSuccessfulChange();
                }
                else {
                    for (let start = new Date(); new Date(start.getTime() + 2 * 60 * 1000) > new Date();) { // 2 min
                        yield this.client
                            .get(`/v1/locks/${this.lockID}/operations/${id}`)
                            .then(r => r.data)
                            .then(r => {
                            switch (r.status) {
                                case interface_1.LockOperationStatus.Completed:
                                    start = new Date(0);
                                    return onSuccessfulChange();
                                case interface_1.LockOperationStatus.Timeout:
                                case interface_1.LockOperationStatus.Failed:
                                    throw Error(r.reason);
                                case interface_1.LockOperationStatus.Pending:
                                default:
                                    return;
                            }
                        });
                    }
                }
            }))
                .catch(err => {
                this.log.debug(err);
                callback(err);
                return err.message;
            });
        });
    }
    listenToEvents() {
        this.lockService
            .getCharacteristic(hap.Characteristic.LockCurrentState)
            .on('get', this.getState.bind(this));
        this.lockService
            .getCharacteristic(hap.Characteristic.LockTargetState)
            .on('get', this.getTargetState.bind(this))
            .on('set', this.setState.bind(this));
        this.batteryService
            .getCharacteristic(hap.Characteristic.BatteryLevel)
            .on('get', this.getBattery.bind(this));
        this.batteryService
            .getCharacteristic(hap.Characteristic.StatusLowBattery)
            .on('get', this.getLowBattery.bind(this));
    }
    getApiKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const name = 'homebridge-glue key';
            this.log('Did not find an API key in config, going to create one instead');
            const url = '/v1/api-keys';
            const scopes = ['events.read', 'locks.read', 'locks.write'];
            yield this.client.get(url)
                .then(resp => resp.data.filter(key => key.name === name))
                .then(generatedKeys => Promise
                .all(generatedKeys.map(key => {
                this.log(`Deleting old api key with id ${key.id}`);
                return this.client.delete(`${url}/${key.id}`);
            })));
            this._apiKey = yield this.client.post('/v1/api-keys', {
                name,
                scopes,
            })
                .then(resp => resp.data)
                .then(data => {
                this.log(`Created api key for Glue with name ${data.name} and id ${data.id} with scopes ${scopes.join(', ')}`);
                return data.apiKey;
            })
                .catch(err => {
                this.log(err);
                this.log('Killing the process!');
                process.exit(1);
            });
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.debug('Initalizing Glue Lock');
            if (!this._apiKey)
                yield this.getApiKey();
            if (!this.lockID)
                yield this.client.get('/v1/locks')
                    .then(resp => resp.data)
                    .then(locks => {
                    this.log(`There is ${locks.length} lock(s) available:`);
                    locks.forEach((l, i) => this.log(`Lock ${i + 1} with description ${l.description} and id ${l.id}`));
                    this.log(`Will select the first lock, otherwise set it in config.json as: lock-id: '${locks[0].id}'`);
                    const lock = locks[0];
                    this.lockID = lock.id;
                });
            yield this.getLock();
            this.lockService
                .setCharacteristic(hap.Characteristic.Manufacturer, 'Jeppesen x Glue')
                .setCharacteristic(hap.Characteristic.SerialNumber, this.lock.serialNumber)
                .setCharacteristic(hap.Characteristic.Name, this.config.name || this.lock.description)
                .setCharacteristic(hap.Characteristic.FirmwareRevision, this.lock.firmwareVersion);
            this.listenToEvents();
            // setInterval( () =>
            //     this.getLock(),
            // 5 * 1000 );
        });
    }
    getLock() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lock = yield this.client.get(`/v1/locks/${this.lockID}`)
                .then(resp => resp.data);
            return this.lock;
        });
    }
    getBatteryLevel() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getLock()
                .then(lock => lock.batteryStatus)
                .catch(err => {
                this.log(`Error getting battery level ${err.message}.`);
                return 0;
            });
        });
    }
}
__decorate([
    helpers_1.initiated,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function]),
    __metadata("design:returntype", Promise)
], LockAccessory.prototype, "getBattery", null);
__decorate([
    helpers_1.initiated,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LockAccessory.prototype, "getLowBattery", null);
__decorate([
    helpers_1.initiated,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LockAccessory.prototype, "getLock", null);
__decorate([
    helpers_1.initiated,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LockAccessory.prototype, "getBatteryLevel", null);
//# sourceMappingURL=index.js.map