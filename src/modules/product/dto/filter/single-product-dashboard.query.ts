import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SingleProductDashboardQuery {
  @ApiProperty({description : "Enter barcode or product_id"})
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @ApiProperty({ nullable: true, required: false })
  @IsOptional()
  @IsString()
  category_sub_category_id: string;
}
