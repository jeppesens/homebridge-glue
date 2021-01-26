// import { Characteristic } from 'homebridge';


export enum HomebridgeLockStatus {
    UNSECURED = 0, // Characteristic.LockCurrentState.UNSECURED
    SECURED = 1, // Characteristic.LockCurrentState.SECURED
    UNKNOWN = 3, // Characteristic.LockCurrentState.UNKNOWN
}

export enum LockEventsEnum {
    unknown = HomebridgeLockStatus.UNKNOWN,
    localLock = HomebridgeLockStatus.SECURED,
    localUnlock = HomebridgeLockStatus.UNSECURED,
    remoteLock = HomebridgeLockStatus.SECURED,
    remoteUnlock = HomebridgeLockStatus.UNSECURED,
    pressAndGo = HomebridgeLockStatus.SECURED,
    manualUnlock = HomebridgeLockStatus.UNSECURED,
    manualLock = HomebridgeLockStatus.SECURED,
};
