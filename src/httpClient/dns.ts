import { Resolver } from 'dns';
const dns = new Resolver();

dns.setServers( [ '1.1.1.1', '1.0.0.1' ] );

export const lookup = async ( hostname: string, _options: any, callback: ( err: Error, address?: string, v?: 0 | 4 | 6 ) => void ) => dns.resolve4( hostname, ( err, addresses ) => ( !err && addresses[0] ) ? callback( null, addresses[0], 4 ) : callback( err ) );
