import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { TransactionTypes } from "src/infrastructure/data/enums/transaction-types";

export class MakeTransactionRequest {
  @ApiProperty()
  @IsNumber()

  amount: number;
  @ApiProperty({required:false,enum:TransactionTypes,default:TransactionTypes.ADMIN_RESET})
  @IsEnum(TransactionTypes)
  type: TransactionTypes;
  @ApiProperty({required:false})
  @IsOptional()
  @IsString()
  order_id: string;
  @ApiProperty({required:false})
  @IsOptional()
  @IsString()
  restaurant_order_id: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  user_id: string;
  @ApiPropertyOptional({required:false,examples:["jaib","jawali","kuraimi"]})
  @IsString()
  @IsOptional()
  wallet_type: string;
  @ApiProperty({required:false})
  @IsOptional()
  @IsString()
  note: string;


  constructor(partial?: Partial<MakeTransactionRequest>) {
    Object.assign(this, partial);
  }
}
