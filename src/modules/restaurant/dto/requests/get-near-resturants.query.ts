import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsLatitude, IsLongitude, IsNotEmpty, IsNumber, Max, Min } from "class-validator";

export class GetNearResturantsQuery {
    @ApiProperty()
    @IsNotEmpty()
    @IsLatitude()
    latitude: number;
    @ApiProperty()
    @IsNotEmpty()
    @IsLongitude()
    longitude: number;

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(50)
    @Transform(({ value }) => Number(value))
    radius: number;
}