export interface IHttpResponse<T> {
    statusCode: number;
    headers: any;
    data: T;
}
