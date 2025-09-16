import { Connection } from 'mongoose';
export declare class HealthService {
    private readonly connection;
    constructor(connection: Connection);
    check(): Promise<{
        status: string;
        timestamp: string;
        database: string;
        service: string;
        version?: undefined;
    } | {
        status: string;
        timestamp: string;
        database: string;
        service: string;
        version: string;
    }>;
}
