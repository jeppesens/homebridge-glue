export interface IGlueEventType {
    Id: string;
    Description: 'Locked' | 'Unlocked' | string;
    SystemStringId: string;
    EventCategoryId: string;
    IconId: string;
    IconUrl: string;
}

export type IGlueEventTypeResponse = Array<IGlueEventType>;
