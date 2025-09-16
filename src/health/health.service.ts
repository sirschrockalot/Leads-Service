import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection('leads') private readonly connection: Connection,
  ) {}

  async check() {
    const isConnected = this.connection.readyState === 1;
    
    if (!isConnected) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        service: 'leads-service',
      };
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      service: 'leads-service',
      version: '1.0.0',
    };
  }
}
