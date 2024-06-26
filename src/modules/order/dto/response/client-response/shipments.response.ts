import { Exclude, Expose } from 'class-transformer';
import { toUrl } from 'src/core/helpers/file.helper';
import { ShipmentStatusEnum } from 'src/infrastructure/data/enums/shipment_status.enum';
import { Shipment } from 'src/infrastructure/entities/order/shipment.entity';

@Exclude()
export class ShipmentsResponse {
  @Expose() shipment_id: string;
  @Expose() status: ShipmentStatusEnum;
  @Expose() shipment_feedback: any;

  @Expose() order: any;

  @Expose() warehouse: any;

  constructor(shipments: Shipment) {
    this.shipment_id = shipments.id;
    this.status = shipments.status;
    this.shipment_feedback = shipments.order_feedback?{
      id: shipments.order_feedback.id,
      communication: shipments.order_feedback.communication,
      packaging: shipments.order_feedback.packaging,
      delivery_time: shipments.order_feedback.delivery_time,
      client_id: shipments.order_feedback.user_id,
      driver_id: shipments.order_feedback.driver_id,
      shipment_id: shipments.order_feedback.shipment_id
    }:null;
    this.order = {
      id: shipments.order.id,
      number: shipments.order.number,
      total_price: shipments.order.total_price,
      is_paid: shipments.order.is_paid,
      payment_method: shipments.order.payment_method,
      estimated_delivery_time: shipments.order.estimated_delivery_time,
      delivery_type: shipments.order.delivery_type,
      delivery_day: shipments.order.delivery_day,
      delivery_fee: shipments.order.delivery_fee,
      client: {
        id: shipments.order.user.id,
        name: shipments.order.user.name,
        phone: shipments.order.user.phone,
        avatar: toUrl(shipments.order.user.avatar),
      },
      address: {
        id: shipments.order.address.id,
        name: shipments.order.address.name,
        address: shipments.order.address.address,
        latitude: shipments.order.address.latitude,
        longitude: shipments.order.address.longitude,
      },
    };

    this.warehouse = {
      id: shipments.warehouse.id,
      name_ar: shipments.warehouse.name_ar,
      name_en: shipments.warehouse.name_en,
      latitude: shipments.warehouse.latitude,
      longitude: shipments.warehouse.longitude,
      address_ar: shipments.warehouse.address_ar,
      address_en: shipments.warehouse.address_en,
    };
  }
}
