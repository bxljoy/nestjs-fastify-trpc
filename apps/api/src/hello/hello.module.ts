import { Module } from "@nestjs/common";
import { HelloController } from "./hello.controller";
import { HealthModule } from "../health/health.module";
import { HelloService } from "./hello.service";

@Module({
  imports: [HealthModule],
  controllers: [HelloController],
  providers: [HelloService]
})
export class HelloModule {}
