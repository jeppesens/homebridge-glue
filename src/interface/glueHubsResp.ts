export interface IGlueHub {
    Id: string;
    SerialNumber: string;
    Status: number;
    Description: string;
    FirmwareVersion: string;
    HardwareVersion: string;
    Created: string;
    BusyUntil: null;
    LastCommunication: string;
    OwnerId: string;
    LockIds: string[];
    AvailableFirmwareVersion: unknown;
}

export type IGlueHubsResponse = Array<IGlueHub>;
