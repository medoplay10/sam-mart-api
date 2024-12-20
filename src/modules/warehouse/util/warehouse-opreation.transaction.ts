import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseTransaction } from 'src/core/base/database/base.transaction';
import { DataSource, EntityManager } from 'typeorm';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';

import { plainToInstance } from 'class-transformer';
import { Product } from 'src/infrastructure/entities/product/product.entity';

import { StorageManager } from 'src/integration/storage/storage.manager';
import { ImageManager } from 'src/integration/sharp/image.manager';
import * as sharp from 'sharp';
import { ProductImage } from 'src/infrastructure/entities/product/product-image.entity';
import { ProductMeasurement } from 'src/infrastructure/entities/product/product-measurement.entity';
import { MeasurementUnitService } from 'src/modules/measurement-unit/measurement-unit.service';

import {
  ensureFilesExists,
  moveTmpFile,
  moveTmpFiles,
} from 'src/core/helpers/file.helper';
import { WarehouseOperationRequest } from '../dto/requests/warehouse-operation.request';
import { WarehouseOperations } from 'src/infrastructure/entities/warehouse/warehouse-opreations.entity';
import { operationType } from 'src/infrastructure/data/enums/operation-type.enum';
import { WarehouseProducts } from 'src/infrastructure/entities/warehouse/warehouse-products.entity';
import { where } from 'sequelize';
import { WarehouseOpreationProducts as WarehouseOpreationProduct } from 'src/infrastructure/entities/warehouse/wahouse-opreation-products.entity';

@Injectable()
export class WarehouseOperationTransaction extends BaseTransaction<
  WarehouseOperationRequest,
  any
> {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) readonly request: Request,
  ) {
    super(dataSource);
  }

  // the important thing here is to use the manager that we've created in the base class
  protected async execute(
    request: WarehouseOperationRequest,
    context: EntityManager,
  ): Promise<any> {
    const warehouseOperation = plainToInstance(WarehouseOperations, {
      type: request.type,
      warehouse_id: request.warehouse_id,
      user_id: this.request.user.id,
    });

    await context.save(warehouseOperation);

    let products_quantity = [];

    await Promise.all(
      request.products.map(async (item) => {
        const find_product = await context.findOne(Product, {
          where: [
            {
              id: item.product_id,
            },
            { barcode: item.barcode },
          ],
        });
        const product = plainToInstance(WarehouseOpreationProduct, {
          ...item,
          product_id: find_product.id,
          operation_id: warehouseOperation.id,
        });
        const product_measurement = await context.find(ProductMeasurement, {
          where: {
            product_id: product.product_id,
          },
        });
        const passed_measurement = product_measurement.filter(
          (product_measurement) =>
            product_measurement.id === product.product_measurement_id,
        )[0];
        const base_measurement = product_measurement.filter(
          (product_measurement) => product_measurement.is_main_unit === true,
        )[0];

        let quantity =
          passed_measurement == base_measurement
            ? product.quantity
            : passed_measurement.conversion_factor * product.quantity;
        quantity =
          (operationType.SELL == request.type) || (operationType.EXPORT == request.type) ? quantity*-1 : quantity ;

        product.quantity = quantity;

        product.product_measurement_id = base_measurement.id;
        await context.save(product);

        const warehouseProducts = await context.findOne(WarehouseProducts, {
          where: {
            warehouse_id: request.warehouse_id,
            product_id: product.product_id,
          },
        });
        if (
          (warehouseProducts == null && quantity < 0) ||
          warehouseProducts == null
            ? 0
            : warehouseProducts.quantity + quantity < 0
        ) {
          throw new BadRequestException(
            'warehouse doesnt have enough products',
          );
        }

        if (warehouseProducts) {
          warehouseProducts.quantity = warehouseProducts.quantity + quantity;
          products_quantity.push({
            name_ar: find_product.name_ar,
            name_en: find_product.name_en,
            quantity: warehouseProducts.quantity,
          });
          await context.save(warehouseProducts);
        } else {
          products_quantity.push({
            name_ar: find_product.name_ar,
            name_en: find_product.name_en,
            quantity: quantity,
          });
          await context.save(
            new WarehouseProducts({
              warehouse_id: request.warehouse_id,
              product_id: product.product_id,
              quantity: quantity,
              product_measurement_id: base_measurement.id,
            }),
          );
        }
      }),
    );

    const response_result = {
      ...warehouseOperation,
      products: products_quantity,
    };

    return response_result;
  }
}
