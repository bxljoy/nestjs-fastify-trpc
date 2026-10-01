import { Controller, Get } from "@nestjs/common";
import { HealthService, type HealthResponse } from "../health/health.service";
import { HelloService, type HelloResponse } from "./hello.service";

type TotalResponse = HealthResponse & HelloResponse

@Controller('hello')
export class HelloController {
  constructor(private readonly healthService: HealthService, private readonly helloService: HelloService) { }

  @Get()
  greeting(): TotalResponse {
    const { status } = this.healthService.getStatus();
    const { message } = this.helloService.getMessage();
    return { status, message };
  }
}
