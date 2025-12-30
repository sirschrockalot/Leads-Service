import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'leads-service-jwt-secret',
    });
  }

  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // Support both auth-service format (userId, role) and legacy format (sub, roles)
    return {
      userId: payload.userId || payload.sub,
      email: payload.email,
      role: payload.role || (payload.roles && payload.roles[0]) || 'user',
      roles: payload.roles || (payload.role ? [payload.role] : []),
      tenantId: payload.tenantId,
      sessionId: payload.sessionId,
    };
  }
}
