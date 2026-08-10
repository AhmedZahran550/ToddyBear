import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.type !== 'device') {
      throw new UnauthorizedException(
        'Access restricted to authenticated devices. Please log in first via /api/auth/device/login.',
      );
    }

    return true;
  }
}
