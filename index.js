const axios = require('axios');
let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-glue", "glue-lock", LockAccessory);
}

const delay = (milliseconds) => new Promise(r => setTimeout(r, milliseconds * 1000));

const lockStateEnum = {
    'Locked': 'SECURED',
    'Unlocked': 'UNSECURED',
    'SECURED': 1,
    'UNSECURED': 0,
    '1': 'SECURED',
    '0': 'UNSECURED',
}

class LockAccessory {
    constructor(log, config) {
        this.log = log;
        this.config = config;
        this.lastEventCheck = new Date(0);
        this.lockService = new Service.LockMechanism(this.name);
        this.currentStatusOfLock = lockStateEnum.Unlocked;

        this.init();
        this.listenToEvents();
    }

    get log() {
        return (...toLog) => {
            this.logHolder(...toLog)
            return toLog;
        }
    }

    set log(data) {
        this.logHolder = data;
    }

    listenToEvents() {
        this.lockService
            .getCharacteristic(Characteristic.LockCurrentState)
            .on('get', this.getState.bind(this));

        this.lockService
            .getCharacteristic(Characteristic.LockTargetState)
            .on('get', this.getState.bind(this))
            .on('set', this.setState.bind(this));

        this.batteryService = new Service.BatteryService(this.name);

        this.batteryService
            .getCharacteristic(Characteristic.BatteryLevel)
            .on('get', this.getBattery.bind(this));

        this.batteryService
            .getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', this.getLowBattery.bind(this));
    }
    
    get name() {
        return this.config["name"] || "Glue Lock";
    }
    get url() {
        return this.config["url"] || "https://api.gluehome.com/api";
    }

    get lastEventCheck() {
        return this.lastEventCheckDate;
    }
    set lastEventCheck(data) {
        this.lastEventCheckDate = new Date(data);
    }

    get checkEventsInterval() {
        return this.config["check-for-events-interval"] || 10;
    }
    get checkEventsIsEnabled() {
        return this.config["check-for-events"] || true
    }

    get client() {
        return axios.create({
            baseURL: this.url,
            auth: { username: this.config.username, password: this.config.password },
            // headers: { 'Content-Type': 'application/json' },
        })
    }

    async init() {
        this.hubID = this.config["hub-id"];
        this.lockID = this.config["lock-id"];
        this.log("Initalizing Glue Lock")
        if (!this.hubID || !this.lockID) {
            await this.client.get('/Hubs')
                .then(({data}) => data)
                .then(hubs => {
                    this.log("Available hubs and locks: ");
                    hubs.forEach(hub => this.log(`hubId: ${hub.Id}, available lockIds: ${hub.LockIds.toString()}`))
                    this.log(`Will select the first hub and first lock, otherwise set it in config.json as: hub-id: "${hubs[0].Id}", lock-id: "${hubs[0].LockIds[0]}"`);
                    this.hubID = hubs[0].Id;
                    this.lockID = hubs[0].LockIds[0];
                })
                .catch(err => this.log(`Got error: ${err.message} from /Hubs`));
        }
        await this.checkEvents(); // get last known state from Glue.
        if (this.checkEventsIsEnabled) {
            setInterval(() => this.checkEvents(),
                this.checkEventsInterval * 1000);
        }
    }

    getState(callback) {
        // Only works if the status was last set by Homebridge or the Glue app NOT if manually unlocked or locked.
        callback(null, Characteristic.LockCurrentState[this.currentStatusOfLock]);
    }

    getCharging(callback) {
        callback(null, Characteristic.ChargingState.NOT_CHARGING);
    }

    get currentStatusOfLock() {
        return this.currentStatusOfLockHolder;
    }
    set currentStatusOfLock(state) {
        this.currentStatusOfLockHolder = state;
        this.lastEventCheck = new Date();
        this.lockService.setCharacteristic(Characteristic.LockCurrentState, state);
    }
    
    async getBatteryLevel() {
        return this.client.get('/Locks/' + this.lockID)
            .then(({data}) => data.BatteryStatusAfter)
            .then(batteryStatus => batteryStatus / 255 * 100)
            .then(batteryLevel => this.log(`Battery level is ${batteryLevel}`))
            .catch(err => this.log(`Error getting battery level (status code ${(err.response || {}).status}): "${err.message}".`));
    }

    async getBattery(callback) {
        return this.getBatteryLevel()
            .then(batteryLevel => callback(null, batteryLevel))
            .catch(err => callback(err))
    }

    async getLowBattery(callback) {
        return this.getBatteryLevel()
            .then(batteryLevel =>  (batteryLevel > 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
            .then(batteryLevel => callback(null, batteryLevel))
            .catch(err => callback(err));
    }

    async setState(HubCommand, callback) {
        this.log("Set state to %s", lockStateEnum[HubCommand]);
        return this.client.post('/Hubs/' + this.hubID + '/Commands', { 
            LockId: this.lockID, 
            HubCommand,
        })
        .then(({data}) => data)
        .then(({Status}) => {
            if (Status === 1) {
                this.currentStatusOfLock = lockStateEnum[HubCommand];
                callback(null);
                return `State change completed and set to ${lockStateEnum[HubCommand]}.`;
            } else {
                throw new Error("Error setting lock state.");
            }
        })
        .catch(err => {callback(err); return err.message})
        .then(m => this.log(m));
    }

    getServices() {
        return [this.lockService, this.batteryService];
    }
    
    checkEvents() {
        this.client.get('/Events/')
        .then(({data}) => data.LockEvent.filter(({LockId, Created}) => LockId === this.lockID && new Date(Created + "Z") > this.lastEventCheck))
        .then(events => events[0])
        .then(({EventTypeId}) => this.client.get('/EventTypes/' + EventTypeId)
            .then(({data}) => data.Description))
        .then(EventAction => this.currentStatusOfLock = lockStateEnum[EventAction])
        .catch(() => {})
    }
}
