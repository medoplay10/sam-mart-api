import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { operationType } from 'src/infrastructure/data/enums/operation-type.enum';


export class WarehouseOperationProductRequest{

    @ApiProperty()
    @IsString()
    product_id: string;

    @ApiProperty({required:false})
    @IsString()
    @IsOptional()
    barcode ?: string;

    @ApiProperty()
    @IsString()
    product_measurement_id: string;

    @ApiProperty()
    @IsNumber()
    @Transform(({ value }) => Number(value))
    quantity: number;

}
export class WarehouseOperationRequest {
  @ApiProperty()
  @IsString()
  warehouse_id: string;

  @ApiProperty({
    type: 'enum',
    enum: [operationType.IMPORT, operationType.EXPORT],
  })
  @IsEnum(operationType)
  type: operationType;

  @ApiProperty({ type: WarehouseOperationProductRequest, isArray: true })

  products: WarehouseOperationProductRequest[];
}
