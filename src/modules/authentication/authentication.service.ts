import { JwtService } from '@nestjs/jwt';
import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginRequest } from './dto/requests/signin.dto';
import { Inject } from '@nestjs/common/decorators';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterRequest } from './dto/requests/register.dto';
import { SendOtpRequest } from './dto/requests/send-otp.dto';
import { VerifyOtpRequest } from './dto/requests/verify-otp.dto';
import { RegisterUserTransaction } from './transactions/register-user.transaction';
import { SendOtpTransaction } from './transactions/send-otp.transaction';
import { UserService } from '../user/user.service';
import { VerifyOtpTransaction } from './transactions/verify-otp.transaction';
import { jwtSignOptions } from 'src/core/setups/jwt.setup';
import { VerifyPhoneTransaction } from './transactions/edit-phone.transaction';
import { DeleteAccountTransaction } from './transactions/delete-account.transaction';
import { RegisterDriverTransaction } from './transactions/register-driver.transaction';
import { DriverRegisterRequest } from './dto/requests/driver-register.dto';
import { UpdateDriverStatusRequest } from './dto/requests/update-driver-status.request';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(RegisterUserTransaction) private readonly registerUserTransaction: RegisterUserTransaction,
    @Inject(RegisterDriverTransaction) private readonly registerDriverTransaction: RegisterDriverTransaction,
    @InjectRepository(Driver) private readonly driverRepository: Repository<Driver>,

    @Inject(SendOtpTransaction) private readonly sendOtpTransaction: SendOtpTransaction,
    @Inject(VerifyOtpTransaction) private readonly verifyOtpTransaction: VerifyOtpTransaction,
    @Inject(VerifyPhoneTransaction) private readonly verifyPhoneTransaction: VerifyPhoneTransaction,
    @Inject(DeleteAccountTransaction) private readonly deleteAccountTransaction: DeleteAccountTransaction,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly _config: ConfigService,
  ) { }

  async validateUser(req: LoginRequest): Promise<any> {
    const user = await this.userService.findOne([
      { email: req.username },
      { username: req.username },
      { phone: req.username },
    ] as any);
    let isMatch = false;
    if (user) {
      isMatch = await bcrypt.compare(
        req.password + this._config.get('app.key'),
        user.password,
      );
    }
    if (user && isMatch) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    if (!user) throw new BadRequestException('message.invalid_credentials');
    const payload = { username: user.username, sub: user.id };
    return {
      ...user,
      access_token: this.jwtService.sign(payload, jwtSignOptions(this._config)),
    };
  }

  async register(req: RegisterRequest) {
    const user = await this.registerUserTransaction.run(req);

    return user;
  }

  async driverRegister(req: DriverRegisterRequest) {
    const user = await this.registerDriverTransaction.run(req);

    return user;
  }

  async updateDriverStatus(req: UpdateDriverStatusRequest) {
    const driver = await this.driverRepository.findOne({
      where: { id: req.driver_id },
    });

    if (!driver) throw new BadRequestException('driver not found');

    driver.status = req.status;
    driver.status_reason = req.status_reason;

    await this.driverRepository.save(driver);
    return driver;
  }

  async sendOtp(req: SendOtpRequest) {
    return await this.sendOtpTransaction.run(req);
  }

  async verifyOtp(req: VerifyOtpRequest) {
    return await this.verifyOtpTransaction.run(req);
  }

  async verifyPhone(req: VerifyOtpRequest) {
    return await this.verifyPhoneTransaction.run(req);
  }

  async deleteAccount(req: VerifyOtpRequest) {
    return await this.deleteAccountTransaction.run(req);
  }
}
