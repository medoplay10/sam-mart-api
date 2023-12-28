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
import { CreateProductRequest } from '../dto/request/create-product.request';
import { StorageManager } from 'src/integration/storage/storage.manager';
import { ImageManager } from 'src/integration/sharp/image.manager';
import * as sharp from 'sharp';
import { ProductImage } from 'src/infrastructure/entities/product/product-image.entity';
import { ProductMeasurement } from 'src/infrastructure/entities/product/product-measurement.entity';
import { MeasurementUnitService } from 'src/modules/measurement-unit/measurement-unit.service';
import { CreateProductMeasurementRequest } from '../dto/request/create-product-measurement.request';
import {
  ensureFilesExists,
  moveTmpFile,
  moveTmpFiles,
} from 'src/core/helpers/file.helper';

@Injectable()
export class AddProductTransaction extends BaseTransaction<
  CreateProductRequest,
  Product
> {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) readonly request: Request,
    @Inject(ImageManager) private readonly imageManager: ImageManager,

    @Inject(StorageManager) private readonly storageManager: StorageManager,
    @Inject(MeasurementUnitService)
    private readonly measurementUnitService: MeasurementUnitService,
  ) {
    super(dataSource);
  }

  // the important thing here is to use the manager that we've created in the base class
  protected async execute(
    query: CreateProductRequest,
    context: EntityManager,
  ): Promise<Product> {
    try {
      const {
        description,
        is_active,
        is_recovered,
        measurements,
        name_ar,
        name_en,
        product_images,
      } = query;
      //* -------------------- Create Product ----------------------------

      const createProduct = context.create(Product, {
        description,
        is_active,
        is_recovered,
        name_ar,
        name_en,
      });

      // const moveLogoImage = moveTmpFile(logo, '/product-images/');
      // createProduct.logo = moveLogoImage.next().value as string;

      //* save product
      const saveProduct = await context.save(Product, createProduct);

      //* -------------------- Create Product Images ----------------------------

      //* validate product images
      const product_images_url = product_images.map((image) => image.url);
      ensureFilesExists(product_images_url);

      //* generator to move images to product-images folder
      const moveItemImages = moveTmpFiles(
        product_images_url,
        '/product-images/',
      );
      const newItemImagePaths = moveItemImages.next().value as string[];
      for (let index = 0; index < product_images.length; index++) {
        product_images[index].url = newItemImagePaths[index];
      }
      //* create Product images

      const productImages = product_images.map((image) => {
        return context.create(ProductImage, {
          url: image.url,
          is_logo: image.is_logo,
          product_id: saveProduct.id,
        });
      });

      //* save product images
      await context.save(ProductImage, productImages);

      //* -------------------- Add Measurements To Product ----------------------------

      //* There must be a primary unit
      if (!measurements.find((measurement) => measurement.is_main_unit)) {
        throw new NotFoundException('There must be a primary unit');
      }

      for (let index = 0; index < measurements.length; index++) {
        //* Check Measurement Unit
        await this.measurementUnitService.single(
          measurements[index].measurement_unit_id,
        );

        //* Create Product Measurement
        const createProductMeasurement = context.create(ProductMeasurement, {
          conversion_factor: measurements[index].conversion_factor,
          measurement_unit_id: measurements[index].measurement_unit_id,
          product_id: saveProduct.id,
        });

        //* Set Main Unit
        if (measurements[index].is_main_unit) {
          createProductMeasurement.base_unit_id =
            measurements[index].measurement_unit_id;
        }

        //* Save Product Measurement

        await context.save(createProductMeasurement);
      }

      return await context.findOne(Product, {
        where: { id: saveProduct.id },
        relations: {
          product_images: true,
          product_measurements: {
            measurement_unit: true,
          },
        },
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
