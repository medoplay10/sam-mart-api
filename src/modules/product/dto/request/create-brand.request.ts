import {  ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

export class CreateBrandRequest {
    @ApiProperty()
    @IsString()
    name_en: string;

    @ApiProperty()
    @IsString()
    name_ar: string;

    @ApiProperty({ type: 'file', required: true })
    logo: Express.Multer.File;
}
    

export class UpdateBrandRequest {

    @ApiProperty()
    @IsString()
    id: string;
    @ApiProperty({required:false})
    @IsOptional()
    @IsString()
    name_en: string;

    @ApiProperty({required:false})
    @IsOptional()
    @IsString()
    name_ar: string;

    @ApiProperty({ type: 'file', required: false })
    @IsOptional()
    logo: Express.Multer.File;
}

export class LinkBrandProuductRequest {

    @ApiProperty()
    @IsString()
    brand_id: string;
    @ApiProperty({required:false,isArray:true})
    @IsArray()
    product_ids: string[];

   
}