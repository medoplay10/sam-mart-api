import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { ShipmentStatusEnum } from "src/infrastructure/data/enums/shipment_status.enum";
import { Shipment } from "src/infrastructure/entities/order/shipment.entity";

export class GetDriverRestaurantOrdersQuery {
    @ApiProperty({type: ShipmentStatusEnum, required: false, enum: [ShipmentStatusEnum.ACTIVE,ShipmentStatusEnum.ACCEPTED,ShipmentStatusEnum.READY_FOR_PICKUP,ShipmentStatusEnum.PICKED_UP, ShipmentStatusEnum.DELIVERED, ShipmentStatusEnum.COMPLETED]})    
    @IsOptional()
    status:ShipmentStatusEnum

    @ApiProperty()
    @IsOptional()
    limit: number

    @ApiProperty()
    @IsOptional()
    page: number

    @ApiProperty()
    @IsOptional()
    date:string


}

