import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
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
