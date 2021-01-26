import { AccessoryPlugin, API, HAP, Logging, Service } from 'homebridge';

import { HomebridgeLockStatus, LockEventsEnum } from './enum';
import axios, { AxiosInstance } from 'axios';
import { IGlueApiKeyResp, IGlueApiKeysResp, IConfig, IGlueCommandResp, IGlueLockStatusResp, LockOperationType, LockOperationStatus, GlueEventType } from './interface';
import { initiated } from './helpers';

let hap: HAP;


export default function( homebridge: API ) {
    hap = homebridge.hap;
    homebridge.registerAccessory( 'homebridge-glue', 'glue-lock', LockAccessory );
}


class LockAccessory implements AccessoryPlugin {

    private get name(): string {
        return this.config.name || 'Glue Lock';
    }

    private _apiKey?: string;
    private _client?: AxiosInstance;

    private get client(): AxiosInstance {
        if ( !this._client ) {
            const client = axios.create( {
                baseURL: 'https://user-api.gluehome.com',
                timeout: 60000,
            } );

            client.interceptors.request.use( config => {
                this.log.debug( `making ${config.method} to ${config.url} with request body ${config.data ? JSON.stringify( config.data, null, 2 ) : null}` );
                if ( !this._apiKey || config.url.match( '/v1/api-keys' ) )
                    config.auth = { username: this.config.username, password: this.config.password }
                else
                    config.headers.authorization = `Api-Key ${this._apiKey}`;
                return config;
            }, error => {
                this.log.debug( error );
                return Promise.reject( error );
            } );

            client.interceptors.response.use( resp => {
                this.log.debug( `Resp ${JSON.stringify( resp.data, null, 2 )}` );
                return resp;
            }, error => {
                this.log.debug( error.response );
                if ( error.response?.status === 401 )
                    process.kill( 1 );
                return Promise.reject( error );
            } )

            this._client = client;
        }
        return this._client
    }
    private get lastEvent() {
        return this.lock?.lastLockEvent?.eventTime ? new Date( this.lock.lastLockEvent.eventTime ) : new Date( 0 );
    }
    private _lock: IGlueLockStatusResp;
    private set lock( lock: IGlueLockStatusResp ) {
        this.log.debug( `Setting lock to ${JSON.stringify( lock, null, 2 )}` );
        if ( lock.lastLockEvent && new Date( lock.lastLockEvent.eventTime ) > this.lastEvent ) {
            this._lock = lock;
            this.targetState = undefined;
            this.lockService.setCharacteristic( hap.Characteristic.LockCurrentState, this.currentState );
            if ( this.lock.batteryStatus )
                this.batteryService.setCharacteristic( hap.Characteristic.BatteryLevel, this.lock.batteryStatus );
            this.log.debug( `Set the lock to ${JSON.stringify( lock, null, 2 )}` );
        }
    }
    private get lock(): IGlueLockStatusResp {
        return this._lock;
    }
    private lockID: string;
    private targetState: HomebridgeLockStatus;
    private getTargetState() {
        return this.targetState;
    }
    private lockService: Service = new hap.Service.LockMechanism( this.name );
    private batteryService: Service = new hap.Service.BatteryService( this.name );

    constructor( private log: Logging, private readonly config: IConfig ) {
        if ( this.config['api-key'] )
            this._apiKey = this.config['api-key'];
        else if ( !this.config.username || !this.config.password )
            throw new Error( 'Config requires api-key or a username and password' );
        this.lockID = config['lock-id'];
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.init();
    }

    public getServices() {
        return [this.lockService, this.batteryService];
    }

    public getCharging( callback: ( err: Error, resp?: 0 ) => void ) {
        callback( null, hap.Characteristic.ChargingState.NOT_CHARGING );
    }


    public getState( callback: ( err: Error, resp?: HomebridgeLockStatus ) => void ) {
        let state: HomebridgeLockStatus;
        switch ( this.lock?.lastLockEvent?.eventType ) {
        case 'pressAndGo':
        case 'localLock':
        case 'manualLock':
        case 'remoteLock':
            state = hap.Characteristic.LockCurrentState.SECURED;
            break;
        case 'localUnlock':
        case 'manualUnlock':
        case 'remoteUnlock':
            state = hap.Characteristic.LockCurrentState.UNSECURED;
            break;
        case 'unknown':
        default:
            state = hap.Characteristic.LockCurrentState.UNKNOWN;
        }
        callback( null, state );
    }

    private get currentState(): HomebridgeLockStatus {
        let val: HomebridgeLockStatus;
        this.getState( ( err, vals ) => {
            val = vals
        } );
        return val
    }

    @initiated
    public async getBattery( callback: ( err: Error, resp?: number ) => void ) {
        return this.getBatteryLevel()
            .then( batteryLevel => callback( null, batteryLevel ) )
            .catch( err => callback( err ) );
    }

    @initiated
    public async getLowBattery( callback ) {
        return this.getBatteryLevel()
            .then( batteryLevel => ( batteryLevel >= 20 ) ? hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : hap.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW )
            .then( lowBattery => callback( null, lowBattery ) )
            .catch( err => callback( err ) );
    }

    public async setState( command: HomebridgeLockStatus, callback: ( err: Error, resp?: undefined ) => void ) {
        this.targetState = command;
        this.log.debug( `Set state to ${command === HomebridgeLockStatus.UNSECURED ? 'unlocked' : 'locked'}` );
        let callbackCalled = false;
        const onSuccessfulChange = () => {
            if ( callbackCalled ) return;
            this.lock = ( {
                lastLockEvent: {
                    eventTime: new Date().toISOString(),
                    eventType: command ? 'remoteLock' : 'remoteUnlock',
                }
            } as any as IGlueLockStatusResp );
            callback( null );
            callbackCalled = true;
        }
        await this.client.post<IGlueCommandResp>( `/v1/locks/${this.lockID}/operations`, {
            type: command === HomebridgeLockStatus.UNSECURED ? LockOperationType.Unlock : LockOperationType.Lock,
        } )
            .then( resp => resp.data )
            .then( async ( { status, id } ) => {
                if ( status === LockOperationStatus.Completed ) { // Success
                    onSuccessfulChange()
                } else {
                    for ( let start = new Date(); new Date( start.getTime() + 2 * 60 * 1000 ) > new Date(); ) {  // 2 min
                        await this.client
                            .get<IGlueCommandResp>( `/v1/locks/${this.lockID}/operations/${id}` )
                            .then( r => r.data )
                            .then( r => {
                                switch ( r.status ) {
                                case LockOperationStatus.Completed:
                                    start = new Date( 0 );
                                    return onSuccessfulChange();
                                case LockOperationStatus.Timeout:
                                case LockOperationStatus.Failed:
                                    throw Error( r.reason );
                                case LockOperationStatus.Pending:
                                default:
                                    return;
                                }
                            } )
                    }
                }
            } )
            .catch( err => {
                this.log.debug( err );
                callback( err );
                return err.message;
            } );
    }

    private listenToEvents() {
        this.lockService
            .getCharacteristic( hap.Characteristic.LockCurrentState )
            .on( 'get', this.getState.bind( this ) );

        this.lockService
            .getCharacteristic( hap.Characteristic.LockTargetState )
            .on( 'get', this.getTargetState.bind( this ) )
            .on( 'set', this.setState.bind( this ) );

        this.batteryService
            .getCharacteristic( hap.Characteristic.BatteryLevel )
            .on( 'get', this.getBattery.bind( this ) );

        this.batteryService
            .getCharacteristic( hap.Characteristic.StatusLowBattery )
            .on( 'get', this.getLowBattery.bind( this ) );
    }

    private async getApiKey() {
        const name = 'homebridge-glue key';
        this.log( 'Did not find an API key in config, going to create one instead' );
        const url = '/v1/api-keys';
        const scopes = ['events.read', 'locks.read', 'locks.write'];
        await this.client.get<IGlueApiKeysResp[]>( url )
            .then( resp => resp.data.filter( key => key.name === name ) )
            .then( generatedKeys => Promise
                .all( generatedKeys.map( key => {
                    this.log( `Deleting old api key with id ${key.id}` );
                    return this.client.delete( `${url}/${key.id}` );
                } ) )
            );

        this._apiKey = await this.client.post<IGlueApiKeyResp>( '/v1/api-keys', {
            name,
            scopes,
        } )
            .then( resp => resp.data )
            .then( data => {
                this.log( `Created api key for Glue with name ${data.name} and id ${data.id} with scopes ${scopes.join( ', ' )}` );
                return data.apiKey;
            } )
            .catch( err => {
                this.log( err );
                this.log( 'Killing the process!' );
                process.exit( 1 );
            } )
    }

    private async init() {
        this.log.debug( 'Initalizing Glue Lock' );
        if ( !this._apiKey )
            await this.getApiKey();
        if ( !this.lockID )
            await this.client.get<IGlueLockStatusResp[]>( '/v1/locks' )
                .then( resp => resp.data )
                .then( locks => {
                    this.log( `There is ${locks.length} lock(s) available:` );
                    locks.forEach( ( l, i ) => this.log( `Lock ${i + 1} with description ${l.description} and id ${l.id}` ) );
                    this.log( `Will select the first lock, otherwise set it in config.json as: lock-id: '${locks[0].id}'` );
                    const lock = locks[0];
                    this.lockID = lock.id;
                } );
        await this.getLock();

        this.lockService
            .setCharacteristic( hap.Characteristic.Manufacturer, 'Jeppesen x Glue' )
            .setCharacteristic( hap.Characteristic.SerialNumber, this.lock.serialNumber )
            .setCharacteristic( hap.Characteristic.Name, this.config.name || this.lock.description )
            .setCharacteristic( hap.Characteristic.FirmwareRevision, this.lock.firmwareVersion );

        this.listenToEvents();

        // setInterval( () =>
        //     this.getLock(),
        // 5 * 1000 );
    }

    @initiated
    private async getLock(): Promise<IGlueLockStatusResp> {
        this.lock = await this.client.get<IGlueLockStatusResp>( `/v1/locks/${this.lockID}` )
            .then( resp => resp.data );
        return this.lock;
    }

    @initiated
    private async getBatteryLevel(): Promise<number> {
        return this.getLock()
            .then( lock => lock.batteryStatus )
            .catch( err => {
                this.log( `Error getting battery level ${err.message}.` );
                return 0;
            } );
    }
}
