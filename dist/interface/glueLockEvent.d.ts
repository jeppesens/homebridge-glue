export declare type GlueEventType = 'unknown' | 'localLock' | 'localUnlock' | 'remoteLock' | 'remoteUnlock' | 'pressAndGo' | 'manualUnlock' | 'manualLock';
export interface IGlueLockEvent {
    eventType: GlueEventType;
    eventTime: string;
}
