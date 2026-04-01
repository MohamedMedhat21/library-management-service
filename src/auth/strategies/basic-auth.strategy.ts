import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthStrategy extends PassportStrategy(Strategy, 'basic') {
  constructor(private readonly configService: ConfigService) {
    super({ passReqToCallback: false });
  }

  validate(username: string, password: string): boolean {
    const validUser = this.configService.get<string>('API_AUTH_USERNAME');
    const validPass = this.configService.get<string>('API_AUTH_PASSWORD');

    if (username === validUser && password === validPass) {
      return true;
    }
    throw new UnauthorizedException('Invalid credentials');
  }
}
