export declare enum LockOperationType {
    Lock = "lock",
    Unlock = "unlock"
}
export declare enum LockOperationStatus {
    Pending = "pending",
    Completed = "completed",
    Timeout = "timeout",
    Failed = "failed"
}
export interface IGlueCommandResp {
    id: string;
    status: LockOperationStatus;
    reason?: string;
}
