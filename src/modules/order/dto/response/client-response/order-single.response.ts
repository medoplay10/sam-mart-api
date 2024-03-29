import { Exclude, Expose } from 'class-transformer';
import { toUrl } from 'src/core/helpers/file.helper';
import { DeliveryType } from 'src/infrastructure/data/enums/delivery-type.enum';
import { PaymentMethodEnum } from 'src/infrastructure/data/enums/payment-method';
import { Order } from 'src/infrastructure/entities/order/order.entity';

@Exclude()
export class OrderSingleResponse {
  @Expose() order_id: string;


  @Expose() order_number: string;

  @Expose() total_price: number;

  @Expose() order_products: number;

  @Expose() address: any;
  @Expose() shipments: any;

  constructor(order: Order) {
    this.order_id = order.id;
  
    this.order_number = order.number;
    this.order_products = order.shipments[0].shipment_products.length;
    this.total_price = order.total_price;


    this.shipments = {
      id: order.shipments[0].id,
      order_id: order.shipments[0].order_id,
      driver: order.shipments[0].driver_id
        ? {
            id: order.shipments[0].driver.user.id,
            username: order.shipments[0].driver.user.name,
            phone: order.shipments[0].driver.user.phone,
            avatar: toUrl(order.shipments[0].driver.user.avatar),
            latitude: order.shipments[0].driver.latitude,
            longitude: order.shipments[0].driver.longitude,
          }
        : null,
      status: order.shipments[0].status,
      order_confirmed_at: order.shipments[0].order_confirmed_at,
      order_on_processed_at: order.shipments[0].order_on_processed_at,
      order_shipped_at: order.shipments[0].order_shipped_at,
      order_delivered_at: order.shipments[0].order_delivered_at,
      order_canceled_at: order.shipments[0].order_canceled_at,
      shipment_products: order.shipments[0].shipment_products.map(
        (shipment_product) => {
          return {
            id: shipment_product.id,
            shipment_id: shipment_product.shipment_id,
            product_id: shipment_product.product_id,
            product_category_price_id:shipment_product.product_category_price.id,
            quantity: shipment_product.quantity,
            price: shipment_product.price,
            product_name_ar:
              shipment_product.product_category_price.product_sub_category
                .product.name_ar,
            product_name_en:
              shipment_product.product_category_price.product_sub_category
                .product.name_en,
            product_logo: toUrl(shipment_product.product_category_price.product_sub_category.product.product_images.find(
              (x) => x.is_logo === true,
            ).url),
            total_price: shipment_product.quantity * shipment_product.price,
          
          };
        },
      ),
    };
  }
}

