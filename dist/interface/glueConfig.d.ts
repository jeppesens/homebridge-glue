import { AccessoryConfig } from 'homebridge';
export interface IConfig extends AccessoryConfig {
    username?: string;
    password?: string;
    'api-key'?: string;
    'lock-id'?: string;
}
