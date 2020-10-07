import { lockStateEnum } from './enum';
import { HttpClient } from './httpClient';
import { IConfig, IGlueCommandResp, IGlueEvent, IGlueEventResponse, IGlueEventType, IGlueEventTypeResponse, IGlueHubsResponse, IGlueLockStatusResp } from './interface';

let service: any;
let characteristic: any;

export default function( homebridge: any ) {
    service = homebridge.hap.Service;
    characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory( 'homebridge-glue', 'glue-lock', LockAccessory );
}

class LockAccessory {

    private get name() {
        return this.config.name || 'Glue Lock';
    }
    private get url() {
        return this.config.url || 'https://api.gluehome.com/api';
    }

    private get checkEventsInterval() {
        return this.config['check-for-events-interval'] || 10;
    }
    private get checkEventsIsEnabled() {
        return this.config['check-for-events'] || true;
    }
    // private get client(): AxiosInstance {
    //     return axios.create( {
    //         baseURL: this.url,
    //         auth: { username: this.config.username, password: this.config.password },
    //     } );
    // }

    private get lockStatus() {
        return lockStateEnum[this.currentStatusOfLock];
    }

    private get currentStatusOfLock(): '1' | '0' {
        return this.currentStatusOfLockHolder;
    }
    private set currentStatusOfLock( state ) {
        this.currentStatusOfLockHolder = state; // '1' or '0'.
        this.lastEventCheck = new Date();
        this.lockService.setCharacteristic( characteristic.LockCurrentState, state );
    }
    private hubID: string;
    private lockID: string;
    private currentStatusOfLockHolder: '0' | '1' = characteristic.ChargingState.UNKNOWN; // starts with unknown '3';
    private lastEventCheck: Date = new Date( 0 );
    private lockService: any = new service.LockMechanism( this.name );
    private batteryService: any = new service.BatteryService( this.name );
    private eventTypes: Promise<{ [eventTypeId: string]: IGlueEventType }>;
    private readonly client = new HttpClient( {
        baseURL: this.url,
        auth: { username: this.config.username, password: this.config.password },
    }, this.config['custom-dns'] );

    constructor( private log: any, private readonly config: IConfig ) {
        if ( !this.config.username && !this.config.password ) throw new Error( `Config requires a username and password` );
        if ( !this.config.username ) throw new Error( `Config requires a username` );
        if ( !this.config.password ) throw new Error( `Config requires a password` );

        this.hubID = config['hub-id'];
        this.lockID = config['lock-id'];
        /* tslint:disable-next-line: no-floating-promises */
        this.init();
        this.listenToEvents();
    }

    public getServices() {
        return [this.lockService, this.batteryService];
    }

    public getCharging( callback: ( err: Error, resp?: any ) => void ) {
        callback( null, characteristic.ChargingState.NOT_CHARGING );
    }

    public getState( callback: ( err: Error, resp?: any ) => void ) {
        /* Only works if the status was last set by Homebridge or the Glue app NOT if manually unlocked or locked. */
        callback( null, characteristic.LockCurrentState[this.lockStatus] );
    }

    public async getBattery( callback: ( err: Error, resp?: number ) => void ) {
        return this.getBatteryLevel()
            .then( batteryLevel => callback( null, batteryLevel ) )
            .catch( err => callback( err ) );
    }

    public async getLowBattery( callback ) {
        return this.getBatteryLevel()
            .then( batteryLevel => ( batteryLevel >= 20 ) ? characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : characteristic.StatusLowBattery.BATTERY_LEVEL_LOW )
            .then( lowBattery => callback( null, lowBattery ) )
            .catch( err => callback( err ) );
    }

    public async setState( hubCommand: '1' | '0', callback: ( err: Error, resp?: any ) => void ) {
        this.log( 'Set state to %s', hubCommand === '1' ? 'unlocked' : 'locked' );
        await this.client.post<IGlueCommandResp>( `/Hubs/${this.hubID}/Commands`, {
            LockId: this.lockID,
            HubCommand: hubCommand,
        } ).then( resp => resp.data )
            .then( ( { Status } ) => {
                if ( Status === 1 ) { // Success
                    this.currentStatusOfLock = hubCommand;
                    callback( null );
                    return `State change completed and set to ${lockStateEnum[hubCommand]}.`;
                } else {
                    throw new Error( 'Error setting lock state.' );
                }
            } )
            .catch( err => { callback( err ); return err.message; } )
            .then( m => this.log( m ) );
    }

    private listenToEvents() {
        this.lockService
            .getCharacteristic( characteristic.LockCurrentState )
            .on( 'get', this.getState.bind( this ) );

        this.lockService
            .getCharacteristic( characteristic.LockTargetState )
            .on( 'get', this.getState.bind( this ) )
            .on( 'set', this.setState.bind( this ) );

        this.batteryService
            .getCharacteristic( characteristic.BatteryLevel )
            .on( 'get', this.getBattery.bind( this ) );

        this.batteryService
            .getCharacteristic( characteristic.StatusLowBattery )
            .on( 'get', this.getLowBattery.bind( this ) );
    }

    private async getEventTypes() {
        this.eventTypes = this.client.get<IGlueEventTypeResponse>( `/EventTypes` )
            .then( resp => resp.data )
            .then( events => events.reduce( ( acc, curr ) => ( { ...acc, [curr.Id]: curr } ), {} ) );
        await this.eventTypes;
        /* check for new types once an hour. */
        setTimeout( () => {
            /* tslint:disable-next-line: no-floating-promises */
            this.getEventTypes();
        }, 1 * 60 * 60 * 1000 );
        return this.eventTypes;
    }

    private async init() {
        this.log( 'Initalizing Glue Lock' );
        await this.getEventTypes();
        if ( !this.hubID || !this.lockID ) {
            await this.client.get<IGlueHubsResponse>( '/Hubs' )
                .then( resp => resp.data )
                .then( hubs => {
                    this.log( 'Available hubs and locks: ' );
                    hubs.forEach( hub => this.log( `hubId: ${hub.Id}, available lockIds: ${hub.LockIds}` ) );
                    this.log( `Will select the first hub and first lock, otherwise set it in config.json as: hub-id: '${hubs[0].Id}', lock-id: '${hubs[0].LockIds[0]}'` );
                    this.hubID = hubs[0].Id;
                    this.lockID = hubs[0].LockIds[0];
                } )
                .catch( err => this.log( `Got error: ${err.message} from ${this.client.baseURL}/Hubs` ) );
        }
        if ( !this.config.name ) {
            const lock = await this.getLock();
            this.config.name = lock.Description;
        }
        await this.checkEvents(); // get last known state from Glue.
        if ( this.checkEventsIsEnabled ) {
            setInterval( () => this.checkEvents(),
                this.checkEventsInterval * 1000 );
        }
    }

    private async getLock(): Promise<IGlueLockStatusResp> {
        return this.client.get<IGlueLockStatusResp>( `/Locks/${this.lockID}` )
            .then( resp => resp.data );
    }

    private async getBatteryLevel() {
        return this.getLock()
            .then( resp => resp.BatteryStatusAfter || resp.BatteryStatusBefore )
            .then( batteryStatus => batteryStatus / 255 * 100 )
            .then( batteryLevel => { this.log( `Battery level is ${batteryLevel}` ); return batteryLevel; } )
            .catch( err => this.log( `Error getting battery level (status code ${( err.response || {} ).status}): '${err.message}'.` ) );
    }

    private async checkEvents() {
        const [ events, types ] = await Promise.all( [
            this.client.get<IGlueEventResponse>( '/Events/' )
                .then( resp => resp.data.LockEvent )
                .catch( _e => [] ),
            this.eventTypes,
        ] );

        const lastEvent: IGlueEvent = events
            .filter( ( { LockId, Created, EventTypeId } ) =>
                LockId === this.lockID &&
                new Date( Created + 'Z' ) > this.lastEventCheck &&
                types[EventTypeId] && [ 'Locked', 'Unlocked' ].includes( types[EventTypeId].Description ) )
            .sort( ( a, b ) => new Date( a.Created ) > new Date( b.Created ) ? -1 : 1 )
            [ 0 ];

        if ( !lastEvent ) return;
        this.log( lastEvent );
        const lastEventType = types[lastEvent.EventTypeId];
        if ( lastEventType ) this.currentStatusOfLock = lockStateEnum[lastEventType.Description];
    }
}
