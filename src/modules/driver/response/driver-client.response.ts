import { Exclude, Expose, Transform } from 'class-transformer';
import { toUrl } from 'src/core/helpers/file.helper';
import { DriverStatus } from 'src/infrastructure/data/enums/driver-status.enum';
import { DriverTypeEnum } from 'src/infrastructure/data/enums/driver-type.eum';
import { Gender } from 'src/infrastructure/data/enums/gender.enum';
import { UserStatus } from 'src/infrastructure/data/enums/user-status.enum';
import { Driver } from 'src/infrastructure/entities/driver/driver.entity';

@Exclude()
export class DriverClientResponse {
  @Expose() readonly id: string;
  @Expose() readonly username: string;
  @Expose() readonly email: string;
  @Expose() readonly phone: string;
  @Expose() readonly avatar: string;
  @Expose() readonly birth_date: string;
  @Expose() readonly created_at: Date;
  @Expose() readonly is_receive_orders: boolean;
  @Expose() readonly type:DriverTypeEnum


  @Expose() readonly driver_status: DriverStatus;


  constructor(driver: Driver) {
    this.id = driver?.id;
    this.username = driver?.user.name;
    this.email = driver?.user.email;
    this.phone = driver?.user.phone;
    this.type = driver?.type;
    if (driver?.user?.avatar) {
      this.avatar = toUrl(driver?.user?.avatar);
    }
    this.birth_date = driver?.user?.birth_date;
    this.created_at = driver?.user?.created_at;
    this.is_receive_orders = driver?.is_receive_orders;
    this.driver_status = driver?.status;
  }
}
