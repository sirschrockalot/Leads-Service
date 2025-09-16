import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    validateToken(token: string): Promise<any>;
    generateToken(payload: any): Promise<string>;
}
