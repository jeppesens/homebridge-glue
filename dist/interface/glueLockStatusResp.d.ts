import { IGlueLockEvent } from './glueLockEvent';
export declare enum ConnectionStatus {
    Offline = "offline",
    Disconnected = "disconnected",
    Connected = "connected",
    Busy = "busy"
}
export interface IGlueLockStatusResp {
    id: string;
    serialNumber: string;
    description: string;
    firmwareVersion: string;
    batteryStatus: number;
    connectionStatus: ConnectionStatus;
    lastLockEvent?: IGlueLockEvent;
}
