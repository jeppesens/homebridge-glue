var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-glue", "glue-lock", LockAccessory);
}

function LockAccessory(log, config) {
    this.log = log;
    this.name = config["name"] || "Glue Lock";
    this.url = config["url"] || "https://api.gluehome.com/api";
    this.username = config["username"];
    this.password = config["password"];
    this.hubID = config["hub-id"];
    this.lockID = config["lock-id"];
    this.lockState = 0;
    this.currentStatusOfLock = 'UNSECURED'; //Will only work if the status if only changed by homebridge
    this.lastEventCheck = new Date(0);
    this.checkEventsIsEnabled = config["check-for-events"] || true;
    this.checkEventsInterval = config["check-for-events-interval"] || 10;

    this.lockService = new Service.LockMechanism(this.name);

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

    this.checkEvents = () => {
        this.log("Checking for new events.");
        new Promise((resolve, reject) => {
            request.get({
                url: this.url + "/Events/",
                auth: { user: this.username, password: this.password }
            }, function(err, response, body) {    
                if (!err && response.statusCode == 200) {
                    var Events = JSON.parse(body);
                    this.log("Finding events newer than: ", this.lastEventCheck);
                    var eventsToCheck = Events.LockEvent.filter(({LockId, Created}) => LockId === this.lockID && new Date(Created + "Z") > this.lastEventCheck);
                    resolve(eventsToCheck[0])
                } else {
                    reject(err)
                }
            }.bind(this))
        })
        .catch(err => this.log(err))
        .then(event => {
            if (event) {
                return event;
            } else {
                throw new Error("No new events.");
            }
        })
        .then(({EventTypeId}) => new Promise((resolve, reject) => {
            request.get({
                url: this.url + "/EventTypes/" + EventTypeId,
                auth: { user: this.username, password: this.password }
            }, function(err, response, body) {    
                if (!err && response.statusCode == 200) {
                    var EventType = JSON.parse(body);
                    var Description = EventType.Description;
                    resolve(Description)
                } else {
                    this.log(err);
                    reject(err)
                }
            }.bind(this))
        }))
        .then(EventAction => {
            var state = EventAction === "Locked" ? "SECURED" : "UNSECURED";
            this.currentStatusOfLock = state;
            this.lockService.setCharacteristic(Characteristic.LockCurrentState, state);
            this.lastEventCheck = new Date();
        })
        .catch(() => {})
    }

    this.log("Initalizing Glue Lock")
    new Promise(resolve => {
        if (!this.hubID || !this.lockID) {
            request.get({
                url: this.url + "/Hubs/",
                auth: { user: this.username, password: this.password }
            }, function(err, response, body) {
                if (!err && response.statusCode == 200) {
                    var json = JSON.parse(body);
                    this.log("Available hubs and locks: ");
                    for(const hub of json) {
                        this.log("hubId: %s, available lockIds: %s", hub.Id, hub.LockIds.toString());
                    }
                    this.log("Will select the first hub and first lock, otherwise set it in config.json as: hub-id: '%s', lock-id: '%s' ", json[0].Id, json[0].LockIds[0]);
                    this.hubID = json[0].Id;
                    this.lockID = json[0].LockIds[0];
                } else {
                    this.log("Error with auth (status code %s): %s", response.statusCode, err);
                }
                resolve()
            }.bind(this));
        } else {
            resolve();
        }
    }).then(() => this.checkEvents());

    if (this.checkEventsIsEnabled) {
        setInterval(() => {
            this.checkEvents();
        }, this.checkEventsInterval * 1000);
    }
}

LockAccessory.prototype.getState = function(callback) {
    // Only works if the status was last set by Homebridge and not e.g the Glue app
    callback(null, Characteristic.LockCurrentState[this.currentStatusOfLock]);
}

LockAccessory.prototype.getCharging = function(callback) {
    callback(null, Characteristic.ChargingState.NOT_CHARGING);
}

LockAccessory.prototype.getBatteryLevel = function() {
    return new Promise((resolve, reject) => {
        this.log("Getting battery level");
        request.get({
            url: this.url + "/Locks/" + this.lockID,
            auth: { user: this.username, password: this.password }
        }, function(err, response, body) {
            if (!err && response.statusCode == 200) {
                var json = JSON.parse(body);
                var batteryLevel = json.BatteryStatusAfter / 255 * 100;
                this.log("Battery level is %s", batteryLevel);
                resolve(batteryLevel);
            }
            else {
                this.log("Error getting battery level (status code %s): %s", response.statusCode, err);
                reject(err);
            }
        }.bind(this));
    })
}

LockAccessory.prototype.getBattery = function(callback) {
    this.getBatteryLevel()
    .then(BatteryLevel => callback(null, BatteryLevel))
    .catch(err => callback(err))
}

LockAccessory.prototype.getLowBattery = function(callback) {
    this.getBatteryLevel()
    .then(batteryLevel =>  (batteryLevel > 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW)
    .then(batteryLevel => callback(null, batteryLevel))
    .catch(err => callback(err));
}

LockAccessory.prototype.setState = function(state, callback) {
    this.log('state', state)
    var lockState = (state == Characteristic.LockTargetState.SECURED) ? "1" : "0";
    // setting status so we can remember if it was locked or not.
    this.log("Set state to %s", lockState);

    request.post({
        url: this.url + "/Hubs/" + this.hubID + '/Commands',
        auth: { user: this.username, password: this.password },
        form: { LockId: this.lockID, HubCommand: lockState }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            var json = JSON.parse(body);
            // TODO Check status...
            this.log("State change complete.");

            // we succeeded, so update the "current" state as well
            this.lockService.setCharacteristic(Characteristic.LockCurrentState, state);
            // this.log('new state', Characteristic.LockCurrentState)

            callback(null); // success
            this.currentStatusOfLock = lockState === "1" ? 'SECURED' : 'UNSECURED';
        }
        else {
            this.log("Error '%s' setting lock state. Response: %s", err, body);
            callback(err || new Error("Error setting lock state."));
        }
    }.bind(this));
}

LockAccessory.prototype.getServices = function() {
    return [this.lockService, this.batteryService];
}