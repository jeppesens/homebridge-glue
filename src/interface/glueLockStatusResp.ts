export interface IGlueLockStatusResp {
    Id: string;
    SerialNumber: string;
    Description: string;
    BatteryStatus: null;
    FirmwareVersion: number;
    TimeZone: null | unknown;
    Created: string;
    Status: 1;
    SystemConfig: null;
    CommandlistVersion: number;
    HardwareVersion: string;
    BatteryStatusBefore: number;
    BatteryStatusAfter: null | number;
    IsNotificationsPublic: boolean;
    IsLogPublic: boolean;
    ImageId: null | unknown;
    PositionX: null | unknown;
    PositionY: null | unknown;
    AvailableFirmwareVersion: null | unknown;
    ImageUrl: null | unknown;
    HubId: string;
}
