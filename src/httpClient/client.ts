import * as https from 'https';
import * as Path from 'path';
import { lookup } from './dns';
import { IHttpResponse } from './interface';

export interface IHttpClientConfig {
    baseURL: string;
    auth: {
        username: string;
        password: string;
    };
}

export class HttpClient {
    public readonly baseURL: string;
    private readonly auth: string;
    constructor( config: IHttpClientConfig, private readonly customDNS = false ) {
        if ( config.baseURL ) this.baseURL = config.baseURL;
        else throw new Error( 'Missing baseURL' );
        if ( config.auth && config.auth.username && config.auth.password )
            this.auth = `Basic ` + Buffer.from( `${config.auth.username}:${config.auth.password}` ).toString( 'base64' );
        else throw new Error( 'Missing auth' );
    }

    public async get<T = any>( path: string ) {
        return this.send<T>( path, 'GET' );
    }

    public async post<T = any>( path: string, body: any ) {
        return this.send<T>( path, 'POST', body );
    }

    private send<T>( path: string, type: 'POST' | 'GET', body?: any ): Promise<IHttpResponse<T>> {
        body = body ? JSON.stringify( body ) : undefined;
        const options = {
            method: type,
            body: type === 'POST' ? body : undefined,
            path: Path.join( this.basePath, path ),
            host: this.host,
            lookup: this.customDNS ? lookup : undefined,
            headers: {
                'Content-Type': 'application/json',
                'Host': this.host,
                'Content-Length': body ? Buffer.byteLength( body ) : 0,
                'Authorization': this.auth,
            },
        };
        return new Promise( ( resolve, reject ) => {
            let responseBody = '';
            const request = https.request( options,
                ( response ) => {
                    response.on( 'data', ( chunk: string ) => responseBody += chunk );
                    response.on( 'end', ( ) => {
                        let resp: any;
                        const statusCode: number = response.statusCode;
                        try {
                            resp = JSON.parse( responseBody );
                        } catch ( error ) {
                            resp = responseBody;
                        }
                        if ( statusCode >= 200 && statusCode < 400 )
                            return resolve( { data: resp, statusCode, headers: response.headers } );
                        else
                            return reject( { statusCode, data: resp, headers: response.headers } );
                    } );
            } );
            request.end( options.body );
        } );
    }

    private get basePath(): string {
        return this.baseURL.replace( new RegExp( `(.+)?${this.host}` ), '' );
    }

    private get host(): string {
        return this.baseURL.replace( /^https:\/\//, '' ).replace( /\/(.+)?/, '' );
    }
}
