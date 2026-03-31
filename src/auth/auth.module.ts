import { Module } from '@nestjs/common';
import { BasicAuthStrategy } from './strategies/basic-auth.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule],
  providers: [BasicAuthStrategy],
  exports: [BasicAuthStrategy],
})
export class AuthModule {}
