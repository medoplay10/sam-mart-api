import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RegisterRequest } from '../dto/requests/register.dto';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { randStr } from 'src/core/helpers/cast.helper';
import { BaseTransaction } from 'src/core/base/database/base.transaction';
import { ImageManager } from 'src/integration/sharp/image.manager';
import * as sharp from 'sharp';
import { StorageManager } from 'src/integration/storage/storage.manager';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { DriverRegisterRequest } from '../dto/requests/driver-register.dto';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';
import { RegionService } from 'src/modules/region/region.service';
import { CountryService } from 'src/modules/country/country.service';
import { CityService } from 'src/modules/city/city.service';
import { FileService } from 'src/modules/file/file.service';
import { Wallet } from 'src/infrastructure/entities/wallet/wallet.entity';

@Injectable()
export class RegisterDriverTransaction extends BaseTransaction<
  DriverRegisterRequest,
  User
> {
  constructor(
    dataSource: DataSource,
    @Inject(ConfigService) private readonly _config: ConfigService,
    @Inject(StorageManager) private readonly storageManager: StorageManager,
    @Inject(ImageManager) private readonly imageManager: ImageManager,
    @Inject(RegionService) private readonly regionService: RegionService,
    @Inject(CountryService) private readonly countryService: CountryService,
    @Inject(CityService) private readonly cityService: CityService,
    @Inject(FileService) private readonly _fileService: FileService,
  ) {
    super(dataSource);
  }

  // the important thing here is to use the manager that we've created in the base class
  protected async execute(
    req: DriverRegisterRequest,
    context: EntityManager,
  ): Promise<User> {
    try {
      if (req.phone) {
        const userPhoneExist = await context.findOneBy(User, {
          phone: req.phone,
        });
        if (userPhoneExist) {
          throw new BadRequestException('message.user_phone_exists');
        }
      }
      if (req.email) {
        const userEmailExist = await context.findOneBy(User, {
          email: req.email,
        });
        if (userEmailExist) {
          throw new BadRequestException('message.user_email_exists');
        }
      }

      //* This Data user needed
      const { username, email, phone, birth_date, avatarFile } = req;

      //* -------------------- Create User ----------------------------
      const createUser = context.create(User, {
        username: phone,
        email,
        phone,
        birth_date,
        name: username,
      });

      //* encrypt password
      const randomPassword = randStr(12);
      createUser.password = await bcrypt.hash(
        randomPassword + this._config.get('app.key'),
        10,
      );

      //* set user role
      createUser.roles = [Role.DRIVER];

      //* save avatar
      if (avatarFile) {
        const pathAvatar = await this.storageManager.store(
          { buffer: avatarFile.buffer, originalname: avatarFile.originalname },
          { path: 'avatars' },
        );

        //* set avatar path
        createUser.avatar = pathAvatar;
      }

      //* save user
      const savedUser = await context.save(User, createUser);

      //* This Data driver needed
      const {
        country_id,
        city_id,
        region_id,
        id_card_number,
        id_card_image,
        license_number,
        license_image,
        vehicle_color,
        vehicle_model,
        vehicle_type,
      } = req;

      //* -------------------- Create Driver ----------------------------

      //* check country
      await this.countryService.single(country_id);

      //* check city
      await this.cityService.single(city_id);

      //* check region
      await this.regionService.single(region_id);

      const CreateDriver = context.create(Driver, {
        user_id: savedUser.id,
        country_id,
        city_id,
        region_id,
        id_card_number,
        license_number,
        vehicle_color,
        vehicle_model,
        vehicle_type,
      });
      //* save IdCardImage
      const pathIdCardImage = await this.storageManager.store(
        {
          buffer: id_card_image.buffer,
          originalname: id_card_image.originalname,
        },
        { path: 'id_card_images' },
      );

      //* set avatar path
      CreateDriver.id_card_image = pathIdCardImage;

      //* save licenseImage
      const pathLicenseImage = await this.storageManager.store(
        {
          buffer: license_image.buffer,
          originalname: license_image.originalname,
        },
        { path: 'license_images' },
      );

      //* set licenseImage path
      CreateDriver.license_image = pathLicenseImage;
      const savedDriver = await context.save(Driver, CreateDriver);
      await context.save(new Wallet({ user_id: savedUser.id }));

      // return user
      return savedUser;
    } catch (error) {
      throw new BadRequestException(
        this._config.get('app.env') !== 'prod'
          ? error
          : 'message.register_failed',
      );
    }
  }
}
