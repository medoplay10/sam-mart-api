import { Expose } from 'class-transformer';
import { of } from 'rxjs';
import { toUrl } from 'src/core/helpers/file.helper';
import { Product } from 'src/infrastructure/entities/product/product.entity';
import { WarehouseResponse } from 'src/modules/warehouse/dto/response/warehouse.response';

export class CartProductWarehouseRespone {
 

  warehouse:WarehouseResponse;
  products: CartProductRespone[];
  constructor(data: CartProductRespone) {
    Object.assign(this, data);
  }

}

export class CartProductRespone {
  readonly product: any;
  section_id: string;
  quantity: number;
  original_price: number;
  price: number;
  unit: string;

  product_id: string;
  warehouse_quantity: number;
  additional_services: any;
  offer:any;
  constructor(data: any) {
    return {
      id: data.id,
      product_id: data.product.product_sub_category.product.id,
      name: data.product.product_sub_category.product.name,
      section_id:
        data.product.product_sub_category.category_subCategory.section_category
          .section_id,
      description: data.product.product_sub_category.product.description,
      original_price: Number(data.original_price),
      price: data.price,
      quantity: data.quantity,
      unit: data.product.product_measurement.measurement_unit.name,
      unit_id: data.product.product_measurement.id,
      is_recovered: data.product.is_recovered,
      min_order_quantity: data.product.product_offer
        ? data.product.product_offer.min_offer_quantity
        : data.product.min_order_quantity,
      max_order_quantity: data.product.product_offer
        ? data.product.product_offer.max_offer_quantity
        : data.product.max_order_quantity,
      warehouse_quantity: data.warehouse_quantity,

      offer_description: data.is_offer?data.product.product_offer.description:null,

      additional_services: data.product.product_additional_services.filter(
        (e) => {
          if (data.additional_services.includes(e.id)) {
            e.additional_service.id = e.id;
            return e.additional_service;
          }
        },
      ),
      image: toUrl(
        data.product.product_sub_category.product.product_images.find(
          (e) => e.is_logo,
        ).url,
      ),
    } as any;
  }
}
