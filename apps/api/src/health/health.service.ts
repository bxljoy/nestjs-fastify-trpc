import { Injectable } from '@nestjs/common';

export type HealthResponse = { status: 'ok' };

@Injectable()
export class HealthService {
  getStatus(): HealthResponse {
    return { status: 'ok' };
  }
}
