export function initiated(
    _target: any,
    _propertyName: string,
    // eslint-disable-next-line @typescript-eslint/ban-types
    descriptor: TypedPropertyDescriptor<Function>,
) {
    const method = descriptor.value;
    descriptor.value = function () {
        if ( !!( this as any )._apiKey && !!( this as any ).lockID )
            return method.apply( this, arguments );
        else return Promise.reject( new Error( 'Not initiated yet' ) );
    };
}
