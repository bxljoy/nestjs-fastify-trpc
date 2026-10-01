import { Injectable } from '@nestjs/common';

export type HelloResponse = { message: string };

@Injectable()
export class HelloService {
  getMessage(): HelloResponse {
    return { message: 'Hello, NestJS' };
  }
}
