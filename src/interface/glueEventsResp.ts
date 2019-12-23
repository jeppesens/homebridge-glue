export interface IGlueEvent {
    Id: string;
    LockId: string;
    UserId: string;
    Created: string;
    EventTime: string;
    EventType: null;
    EventId: null;
    EventTypeId: string;
    ParentId: null;
    AccessId: string;
    LocationLongitude: null;
    LocationLatitude: null;
    LocationElapsedSeconds: null;
    LocationAccuracy: null;
    LocationProvider: null;
}

export interface IGlueEventResponse {
    LockEvent: Array<IGlueEvent>;
}
