var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-glue", "glue-lock", LockAccessory);
}

function LockAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.url = config["url"] || "https://api.gluehome.com/api";
    this.hubID = config["hub-id"];
    this.lockID = config["lock-id"];
    this.username = config["username"];
    this.password = config["password"];
    this.lockState = 0;

    this.lockservice = new Service.LockMechanism(this.name);

    this.lockservice
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', this.getState.bind(this));

    this.lockservice
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));

    this.battservice = new Service.BatteryService(this.name);

    this.battservice
        .getCharacteristic(Characteristic.BatteryLevel)
        .on('get', this.getBattery.bind(this));

    this.battservice
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', this.getLowBatt.bind(this));
}


LockAccessory.prototype.getState = function(callback) {
    // this.log('state in getState', Characteristic.LockTargetState)
    request.get({
        url: this.url + "/Locks/" + this.lockID,
        auth: { user: this.username, password: this.password }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            var json = JSON.parse(body);
            // var batt = json.BatteryStatusAfter / 255 * 100;
            this.log("json", json);
            callback(null, batt); // success
        }
        else {
            this.log("Error getting battery level (status code %s): %s", response.statusCode, err);
            callback(err);
        }
    }.bind(this));
    callback(null, Characteristic.LockCurrentState.UNKNOWN)
}

LockAccessory.prototype.getCharging = function(callback) {
    callback(null, Characteristic.ChargingState.NOT_CHARGING);
}

LockAccessory.prototype.getBattery = function(callback) {
    this.log("Getting battery level");

    request.get({
        url: this.url + "/Locks/" + this.lockID,
        auth: { user: this.username, password: this.password }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            var json = JSON.parse(body);
            var batt = json.BatteryStatusAfter / 255 * 100;
            this.log("Battery level is %s", batt);
            callback(null, batt); // success
        }
        else {
            this.log("Error getting battery level (status code %s): %s", response.statusCode, err);
            callback(err);
        }
    }.bind(this));
}

LockAccessory.prototype.getLowBatt = function(callback) {
    this.log("Getting current battery...");

    request.get({
        url: this.url + "/Locks/" + this.lockID,
        auth: { user: this.username, password: this.password }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            var json = JSON.parse(body);
            var batt = json.BatteryStatusAfter / 255 * 100;
            this.log("Lock battery is %s", batt);
            var low = (batt > 20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
            callback(null, low); // success
        }
        else {
            this.log("Error getting battery (status code %s): %s", response.statusCode, err);
            callback(err);
        }
    }.bind(this));
}

LockAccessory.prototype.setState = function(state, callback) {
    this.log('state', state)
    var lockState = (state == Characteristic.LockTargetState.SECURED) ? "1" : "0";

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
            this.lockservice.setCharacteristic(Characteristic.LockCurrentState, state);
            // this.log('new state', Characteristic.LockCurrentState)

            callback(null); // success
        }
        else {
            this.log("Error '%s' setting lock state. Response: %s", err, body);
            callback(err || new Error("Error setting lock state."));
        }
    }.bind(this));
}

LockAccessory.prototype.getServices = function() {
    return [this.lockservice, this.battservice];
}