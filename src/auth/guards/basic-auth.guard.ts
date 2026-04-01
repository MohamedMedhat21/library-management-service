import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class BasicAuthGuard extends AuthGuard('basic') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ path: string }>();
    const swaggerPaths = ['/api/docs', '/api/docs-json', '/api/docs/'];
    if (swaggerPaths.some((p) => request.path.startsWith(p))) {
      return true;
    }

    return super.canActivate(context);
  }
}
