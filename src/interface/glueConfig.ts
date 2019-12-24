export interface IConfig {
    username: string;
    password: string;
    'hub-id'?: string;
    'lock-id'?: string;
    url?: string;
    name?: string;
    'check-for-events'?: boolean;
    'check-for-events-interval'?: number;
}
