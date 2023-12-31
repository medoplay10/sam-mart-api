import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';
import { Repository, UpdateResult } from 'typeorm';
import { UpdateDriverLocationRequest } from './requests/update-driver-location.request';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver) private driverRepository: Repository<Driver>,
    @Inject(REQUEST) private readonly _request: Request,
  ) {}

  async single(driver_id: string): Promise<Driver> {


    const driver = await this.driverRepository.findOne({
      where: { id: driver_id },
      relations: { user: true },
    });

    if (!driver) {
      throw new Error('message.driver_not_found');
    }
    return driver;
  }

  async all(): Promise<Driver[]> {
    return await this.driverRepository.find({ relations: { user: true } });
  }

  async updateDriverLocation(
    updateDriverLocationRequest: UpdateDriverLocationRequest,
  ): Promise<UpdateResult> {
    return await this.driverRepository.update(
      { user_id: this._request.user.id },
      updateDriverLocationRequest,
    );
  }
}
