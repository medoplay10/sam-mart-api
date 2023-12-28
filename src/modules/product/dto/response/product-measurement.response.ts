import { Exclude, Expose, Transform, plainToClass } from 'class-transformer';
import { MeasurementUnitResponse } from 'src/modules/measurement-unit/dto/responses/measurement-unit.response';

@Exclude()
export class ProductMeasurementResponse {
  @Expose() readonly id: string;

  @Expose() readonly conversion_factor: number;

  @Expose() readonly product_id: string;

  @Transform(({ value }) => plainToClass(MeasurementUnitResponse, value))
  @Expose()
  readonly measurement_unit: MeasurementUnitResponse;

  @Expose() readonly base_unit_id: string;
}