import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CategorySubCategory } from 'src/infrastructure/entities/category/category-subcategory.entity';

import { Product } from 'src/infrastructure/entities/product/product.entity';
import { Warehouse } from 'src/infrastructure/entities/warehouse/warehouse.entity';

import { ProductClientQuery } from './dto/filter/products-client.query';
import { SingleProductClientQuery } from './dto/filter/single-product-client.query';
import { Brackets, IsNull, Not, Repository } from 'typeorm';
import { SubcategoryService } from '../subcategory/subcategory.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ProductFavorite } from 'src/infrastructure/entities/product/product-favorite.entity';
import { Section } from 'src/infrastructure/entities/section/section.entity';
import { ProductFavQuery } from './dto/filter/product-fav.query';
import { Cart } from 'src/infrastructure/entities/cart/cart.entity';
import { ProductOffer } from 'src/infrastructure/entities/product/product-offer.entity';
import { plainToInstance } from 'class-transformer';
import { ProductResponse } from './dto/response/product.response';
import { ProductsNewResponse } from './dto/response/response-client/products-new.response';
import { Constant } from 'src/infrastructure/entities/constant/constant.entity';
import { ConstantType } from 'src/infrastructure/data/enums/constant-type.enum';

@Injectable()
export class ProductClientService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductOffer)
    private readonly productOfferRepository: Repository<ProductOffer>,

    @InjectRepository(CategorySubCategory)
    private readonly categorySubcategory_repo: Repository<CategorySubCategory>,

    @InjectRepository(Warehouse)
    private readonly warehouse_repo: Repository<Warehouse>,

    @Inject(SubcategoryService)
    private readonly subCategoryService: SubcategoryService,

    @InjectRepository(ProductFavorite)
    private readonly productFavorite_repo: Repository<ProductFavorite>,

    @InjectRepository(Section)
    private readonly section_repo: Repository<Section>,

    @InjectRepository(Cart)
    private readonly cart_repo: Repository<Cart>,

    @Inject(REQUEST) private readonly request: Request,
    @InjectRepository(Constant) private readonly constantRepository: Repository<Constant>,
  ) {}

  isArabic(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text);
  }
  //* Get All Products For Client
  async getAllProductsForClient(productClientQuery: ProductClientQuery) {
    const {
      page,
      limit,
      longitude,
      latitude,
      section_id,
      category_sub_category_id,
      product_name,
      sort,
      user_id,
      brand_id,
    } = productClientQuery;
    const skip = (page - 1) * limit;

    let productsSort = {};

    switch (sort) {
      case 'lowest_price':
        // Convert price to a numeric type before sorting
        productsSort = { 'product_category_prices.price': 'ASC' };

        break;
      case 'highest_price':
        productsSort = { 'product_category_prices.price': 'DESC' };

        break;
      case 'new':
        productsSort = { 'product_sub_category.order_by': 'ASC' };
        break;
      case 'brand':
        productsSort = { 'product.order_by_brand': 'ASC' };
        break;
      // handle other sort cases if needed
    }
    // For guests and individuals, orders are taken from the nearest warehouse

    let warehouse: Warehouse;
    if (latitude && longitude) {
      const maxDistanceInMeters = Number((await this.constantRepository.findOne({
        where: {type:ConstantType.MAX_STORAGE_DISTANCE},
      })).variable || 0)*1000;
       warehouse = await this.warehouse_repo
      .createQueryBuilder('warehouse')
      .where('warehouse.is_active = :is_active', { is_active: true })
      .andWhere(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         ) <= :distance`,
        {
          latitude,
          longitude,
          distance: maxDistanceInMeters,
        },
      )
      .orderBy(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         )`,
      )
      .setParameters({ latitude, longitude }) // ensure parameters are reused in orderBy
      .getOne();
    }
  
    // Start building the query
    let query = this.productRepository
      .createQueryBuilder('product')

      .innerJoinAndSelect('product.product_images', 'product_images')

      .leftJoinAndSelect('product.brand', 'brand')

      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .innerJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
        'product_measurements.is_main_unit = true',
      )
      .innerJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      .innerJoinAndSelect(
        'product_measurements.product_category_prices',
        'product_category_prices',
      )
      .leftJoinAndSelect(
        'product_category_prices.product_offer',
        'product_offer',
        'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date AND product_offer.is_active = :isActive',
        {
          current_date: new Date(),
          isActive: true,
        },
      )
      .innerJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )
      .innerJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .innerJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )
      .leftJoinAndSelect('section_category.category', 'category')

      .orderBy(productsSort)

      .skip(skip)
      .take(limit);

    if (user_id) {
      const cartUser = await this.cart_repo.findOne({ where: { user_id } });
      if (!cartUser) {
        throw new NotFoundException('message.user_not_found');
      }

      query = query.leftJoinAndSelect(
        'product_category_prices.cart_products',
        'cart_products',
        'cart_products.cart_id = :cart_id',
        { cart_id: cartUser.id },
      );
      query = query.leftJoinAndSelect('cart_products.cart', 'cart');

      query = query.leftJoinAndSelect(
        'cart_products.product_category_price',
        'cart_product_category_price',
      );
      query = query.leftJoinAndSelect(
        'cart_product_category_price.product_offer',
        'cart_product_offer',
      );

      query = query.leftJoinAndSelect(
        'product.products_favorite',
        'products_favorite',
        'products_favorite.user_id = :user_id',
        { user_id },
      );
    }
    // Modify condition if warehouse is defined
  
      query = query.andWhere('warehousesProduct.warehouse_id = :warehouseId', {
        warehouseId: warehouse?.id,
      });
    

    if (brand_id) {
      query = query.andWhere('brand.id = :brandId', {
        brandId: brand_id,
      });
    }

    // Add search term condition if provided
    if (product_name) {
      // Determine if the product_name is Arabic
      const isProductNameArabic = this.isArabic(product_name); // Implement or use a library to check if the text is Arabic

      // Build the query conditionally based on the language of product_name
      if (isProductNameArabic) {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_ar LIKE :product_name', {
              product_name: `%${product_name}%`,
            }).orWhere('product.keywords LIKE :product_name', {
              product_name: `%${product_name}%`,
            });
          }),
        );
      } else {
        query = query.andWhere(
          new Brackets((qb) => {
            qb.where('product.name_en LIKE :product_name', {
              product_name: `%${product_name}%`,
            }).orWhere('product.keywords LIKE :product_name', {
              product_name: `%${product_name}%`,
            });
          }),
        );
      }
    }

    query = query.andWhere('product.is_active = true');
    query = query.andWhere('product_sub_category.is_active = true');
    // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.andWhere(
        'product_sub_category.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );

      // query = query.andWhere(
      //   'product_sub_categories.category_sub_category_id = :category_sub_category_id',
      //   {
      //     category_sub_category_id,
      //   },
      // );
      const categorySubcategory = await this.categorySubcategory_repo.findOne({
        where: { id: category_sub_category_id },
      });
      if (categorySubcategory) {
        await this.subCategoryService.updateMostHitSubCategory({
          sub_category_id: categorySubcategory.subcategory_id,
        });
      }
    }

    // Conditional where clause based on section
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
      // query = query.andWhere(
      //   'product_section_category.section_id = :section_id',
      //   {
      //     section_id,
      //   },
      // );
    }

    const [products, total] = await query.getManyAndCount();
    return { products, total };
  }

  //* Get All Products For Client grouped by sub category

  async getSubCategoryProductsForClient(
    productClientQuery: ProductClientQuery,
  ) {
    const {
      page,
      limit,
      longitude,
      latitude,
      section_id,
      category_sub_category_id,
      section_category_id,
      product_name,
      sort,
      user_id,
    } = productClientQuery;
    const skip = (page - 1) * limit;
    let warehouse: Warehouse;
    if (latitude && longitude) {
      const maxDistanceInMeters = Number((await this.constantRepository.findOne({
        where: {type:ConstantType.MAX_STORAGE_DISTANCE},
      })).variable || 0)*1000;
       warehouse = await this.warehouse_repo
      .createQueryBuilder('warehouse')
      .where('warehouse.is_active = :is_active', { is_active: true })
      .andWhere(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         ) <= :distance`,
        {
          latitude,
          longitude,
          distance: maxDistanceInMeters,
        },
      )
      .orderBy(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         )`,
      )
      .setParameters({ latitude, longitude }) // ensure parameters are reused in orderBy
      .getOne();
    }

    let productsSortField = '';
    let productsSortOrder = 'ASC';
    
    switch (sort) {
      case 'lowest_price':
        productsSortField = 'product_category_prices.price';
        productsSortOrder = 'ASC';
        break;
      case 'highest_price':
        productsSortField = 'product_category_prices.price';
        productsSortOrder = 'DESC';
        break;
      case 'new':
        productsSortField = 'product_sub_category.order_by';
        productsSortOrder = 'ASC';
        break;
      case 'brand':
        productsSortField = 'product.order_by_brand';
        productsSortOrder = 'ASC';
        break;
      // Add more cases as needed
    }
    


    // const subCategoryProducts = await this.categorySubcategory_repo.find({
    //   where: {
    //     section_category_id: section_category_id,
    //     is_active: true,
    //     product_sub_categories: {
    //       is_active: true,
    //       product: {
    //         product_measurements: { product_category_prices:true },
    //       },
    //     },
    //   },
    //   relations: {
    //     subcategory: true,
    //     product_sub_categories: {

    //           product: {
    //             product_images: true,
    //             product_measurements: {
    //               measurement_unit:true,
    //               product_category_prices: { cart_products: true,product_offer: true ,},
    //             },warehouses_products: true,
    //           },
    //         },

    //   },
    // });
    let query = await this.categorySubcategory_repo
      .createQueryBuilder('categorySubcategory')
      .where('categorySubcategory.section_category_id = :section_category_id', {
        section_category_id,
      })
      .andWhere('categorySubcategory.is_active = true')
      .leftJoinAndSelect('categorySubcategory.subcategory', 'subcategory')
      .leftJoinAndSelect(
        'categorySubcategory.product_sub_categories',
        'product_sub_categories',
      )
      .leftJoinAndSelect('product_sub_categories.product', 'product')
      .andWhere('product.is_active = true')
      .andWhere('product_sub_categories.is_active = true')
      
     
      .leftJoinAndSelect('product.product_images', 'product_images')
      .leftJoinAndSelect('product.product_measurements', 'product_measurements')
      .leftJoinAndSelect('product_measurements.measurement_unit', 'measurement_unit')
      .innerJoinAndSelect(
        'product_measurements.product_category_prices',
        'product_category_prices',
      )
      .innerJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )
      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .leftJoinAndSelect(
        'product_category_prices.product_offer',
        'product_offer',
        'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date AND product_offer.is_active = :isActive',
        {
          current_date: new Date(),
          isActive: true,
        },
      )
     

    if (user_id) {
      const cartUser = await this.cart_repo.findOne({ where: { user_id } });
      if (!cartUser) {
        throw new NotFoundException('message.user_not_found');
      }

      query = query.leftJoinAndSelect(
        'product_category_prices.cart_products',
        'cart_products',
        'cart_products.cart_id = :cart_id',
        { cart_id: cartUser.id },
      );
      query = query.leftJoinAndSelect('cart_products.cart', 'cart');

      query = query.leftJoinAndSelect(
        'cart_products.product_category_price',
        'cart_product_category_price',
      );
      query = query.leftJoinAndSelect(
        'cart_product_category_price.product_offer',
        'cart_product_offer',
      );

      query = query.leftJoinAndSelect(
        'product.products_favorite',
        'products_favorite',
        'products_favorite.user_id = :user_id',
        { user_id },
      );
    }
    // Modify condition if warehouse is defined
  
      query = query.andWhere('warehousesProduct.warehouse_id = :warehouseId', {
        warehouseId: warehouse?.id,
      });
    
    const productSubCategories = query.orderBy('categorySubcategory.order_by', 'ASC') .addOrderBy(productsSortField, productsSortOrder as unknown as 'ASC'||'DESC' ).getMany();
    return productSubCategories;
  }

  //* Get All Products Offers  For Client

  async getAllProductsOffersForClient(productClientQuery: ProductClientQuery) {
    const {
      page,
      limit,
      longitude,
      latitude,
      section_id,
      category_sub_category_id,
      product_name,
      sort,
      user_id,
    } = productClientQuery;
    const skip = (page - 1) * limit;

    let productsSort = {};

    switch (sort) {
      case 'lowest_price':
        // Convert price to a numeric type before sorting
        productsSort = { 'product_category_prices.price': 'ASC' };

        break;
      case 'highest_price':
        productsSort = { 'product_category_prices.price': 'DESC' };

        break;
      case 'new':
        productsSort = { 'product_offer.order_by': 'ASC' };

        break;
      // handle other sort cases if needed
    }

    // For guests and individuals, orders are taken from the nearest warehouse
    let warehouse: Warehouse;
    if (latitude && longitude) {
      const maxDistanceInMeters = Number((await this.constantRepository.findOne({
        where: {type:ConstantType.MAX_STORAGE_DISTANCE},
      })).variable || 0)*1000;
       warehouse = await this.warehouse_repo
      .createQueryBuilder('warehouse')
      .where('warehouse.is_active = :is_active', { is_active: true })
      .andWhere(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         ) <= :distance`,
        {
          latitude,
          longitude,
          distance: maxDistanceInMeters,
        },
      )
      .orderBy(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         )`,
      )
      .setParameters({ latitude, longitude }) // ensure parameters are reused in orderBy
      .getOne();
    }

    // Start building the query
    let query = this.productOfferRepository
      .createQueryBuilder('product_offer')
      .innerJoinAndSelect(
        'product_offer.product_category_price',
        'product_category_prices',
      )

      .innerJoinAndSelect(
        'product_category_prices.product_measurement',
        'product_measurement',
      )
      .innerJoinAndSelect(
        'product_measurement.measurement_unit',
        'measurement_unit',
      )

      .innerJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )

      .innerJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .innerJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )
      .innerJoinAndSelect('product_sub_category.product', 'product')
      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .innerJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
      )
      // .innerJoinAndSelect(
      //   'product_measurements.product_category_prices',
      //   'product_category_prices_measurement',
      // )

      // .innerJoinAndSelect(
      //   'product_category_prices_measurement.product_sub_category',
      //   'product_sub_category_measurement',
      // )

      // .innerJoinAndSelect(
      //   'product_sub_category_measurement.category_subCategory',
      //   'category_subCategory_measurement',
      // )
      // .innerJoinAndSelect(
      //   'category_subCategory_measurement.section_category',
      //   'section_category_measurement',
      // )
      // .innerJoinAndSelect(
      //   'section_category_measurement.section',
      //   'section_measurement',
      // )

      .innerJoinAndSelect('product.product_images', 'product_images')

      .where(
        'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date AND product_offer.is_active = :isActive',
        {
          current_date: new Date(),
          isActive: true,
        },
      )
      .orderBy(productsSort)

      .skip(skip)
      .take(limit);

    if (user_id) {
      const cartUser = await this.cart_repo.findOne({ where: { user_id } });
      if (!cartUser) {
        throw new NotFoundException('message.user_not_found');
      }

      query = query.leftJoinAndSelect(
        'product_category_prices.cart_products',
        'cart_products',
        'cart_products.cart_id = :cart_id',
        { cart_id: cartUser.id },
      );
      query = query.leftJoinAndSelect('cart_products.cart', 'cart');

      query = query.leftJoinAndSelect(
        'cart_products.product_category_price',
        'cart_product_category_price',
      );
      query = query.leftJoinAndSelect(
        'cart_product_category_price.product_offer',
        'cart_product_offer',
      );

      query = query.leftJoinAndSelect(
        'product.products_favorite',
        'products_favorite',
        'products_favorite.user_id = :user_id',
        { user_id },
      );
    }
    // Modify condition if warehouse is defined
 
      query = query.andWhere('warehousesProduct.warehouse_id = :warehouseId', {
        warehouseId: warehouse?.id,
      });
    

    // Add search term condition if provided
    if (product_name) {
      // Determine if the product_name is Arabic
      const isProductNameArabic = this.isArabic(product_name); // Implement or use a library to check if the text is Arabic

      // Build the query conditionally based on the language of product_name
      if (isProductNameArabic) {
        query = query
          .andWhere('product.name_ar LIKE :product_name', {
            product_name: `%${product_name}%`,
          })
          .orWhere('product.keywords LIKE :product_name', {
            product_name: `%${product_name}%`,
          });
      } else {
        query = query
          .andWhere('product.name_en LIKE :product_name', {
            product_name: `%${product_name}%`,
          })
          .orWhere('product.keywords LIKE :product_name', {
            product_name: `%${product_name}%`,
          });
      }
    }

    // // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.andWhere(
        'product_sub_category.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );
      // query = query.andWhere(
      //   'product_sub_category_measurement.category_sub_category_id = :category_sub_category_id',
      //   {
      //     category_sub_category_id,
      //   },
      // );
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
    }

    // // Conditional where clause based on section
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
      // query = query.andWhere(
      //   'section_category_measurement.section_id = :section_id',
      //   {
      //     section_id,
      //   },
      // );
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
    }
    const [products, total] = await query.getManyAndCount();
    return { products, total };
  }

  //* Get Single Product For Client
  async getSingleProductForClient(
    product_id: string,
    singleProductClientFilter: SingleProductClientQuery,
  ) {
    const {
      latitude,
      longitude,
      section_id,
      category_sub_category_id,
      user_id,
    } = singleProductClientFilter;
    // For guests and individuals, orders are taken from the nearest warehouse
    let warehouse: Warehouse;
    if (latitude && longitude) {
      const maxDistanceInMeters = Number((await this.constantRepository.findOne({
        where: {type:ConstantType.MAX_STORAGE_DISTANCE},
      })).variable || 0)*1000;
       warehouse = await this.warehouse_repo
      .createQueryBuilder('warehouse')
      .where('warehouse.is_active = :is_active', { is_active: true })
      .andWhere(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         ) <= :distance`,
        {
          latitude,
          longitude,
          distance: maxDistanceInMeters,
        },
      )
      .orderBy(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         )`,
      )
      .setParameters({ latitude, longitude }) // ensure parameters are reused in orderBy
      .getOne();
    }

    // Start building the query
    let query = this.productRepository
      .createQueryBuilder('product')
      .innerJoinAndSelect('product.product_images', 'product_images')
      .orderBy('product_images.is_logo', 'DESC')
      .innerJoinAndSelect(
        'product.product_sub_categories',
        'product_sub_categories',
      )
      .innerJoinAndSelect(
        'product_sub_categories.category_subCategory',
        'product_category_subCategory',
      )
      .innerJoinAndSelect(
        'product_category_subCategory.section_category',
        'product_section_category',
      )
      .innerJoinAndSelect('product_section_category.section', 'product_section')

      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .innerJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
      )
      .innerJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      .innerJoinAndSelect(
        'product_measurements.product_category_prices',
        'product_category_prices',
      )
      .leftJoinAndSelect(
        'product_category_prices.product_offer',
        'product_offer',
        'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date AND product_offer.is_active = :isActive',
        {
          current_date: new Date(),
          isActive: true,
        },
      )
      .leftJoinAndSelect(
        'product_category_prices.product_additional_services',
        'product_additional_services',
      )
      .leftJoinAndSelect(
        'product_additional_services.additional_service',
        'additional_service',
      )
      .innerJoin(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )
      .innerJoin(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .innerJoin('category_subCategory.section_category', 'section_category');

    // Get single product
    query = query.where('product.id = :product_id', { product_id });
    // Initial condition to ensure product is in at least one warehouse

      query = query.andWhere('warehousesProduct.warehouse_id = :warehouseId', {
        warehouseId: warehouse?.id,
      });
    
    if (user_id) {
      const cartUser = await this.cart_repo.findOne({ where: { user_id } });
      if (!cartUser) {
        throw new NotFoundException('message.user_not_found');
      }

      query = query.leftJoinAndSelect(
        'product_category_prices.cart_products',
        'cart_products',
        'cart_products.cart_id = :cart_id',
        { cart_id: cartUser.id },
      );
      query = query.leftJoinAndSelect('cart_products.cart', 'cart');

      query = query.leftJoinAndSelect(
        'cart_products.product_category_price',
        'cart_product_category_price',
      );
      query = query.leftJoinAndSelect(
        'cart_product_category_price.product_offer',
        'cart_product_offer',
      );

      query = query.leftJoinAndSelect(
        'product.products_favorite',
        'products_favorite',
        'products_favorite.user_id = :user_id',
        { user_id },
      );
    }
    // Conditional where clause based on sub category
    if (category_sub_category_id) {
      query = query.andWhere(
        'product_sub_category.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_categories.is_active = true');
      query = query.andWhere(
        'product_sub_categories.category_sub_category_id = :category_sub_category_id',
        {
          category_sub_category_id,
        },
      );
    }

    // Conditional where clause based on section
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_categories.is_active = true');
      query = query.andWhere(
        'product_section_category.section_id = :section_id',
        {
          section_id,
        },
      );
    }
    const proucut = await query.getOne();
    if (!proucut) {
      throw new NotFoundException('message.product_not_found');
    }
    return await proucut;
  }

  //* Add Or remove Product Favorite
  async productFavorite(product_id: string, section_id: string) {
    const product = await this.productRepository.findOne({
      where: { id: product_id },
    });
    if (!product) {
      throw new NotFoundException('message.product_not_found');
    }
    const section = await this.section_repo.findOne({
      where: { id: section_id },
    });
    if (!section) {
      throw new NotFoundException('message.section_not_found');
    }
    const favorite = await this.productFavorite_repo.findOne({
      where: {
        product_id,
        section_id,
        user_id: this.request.user.id,
      },
    });

    if (favorite) {
      return await this.productFavorite_repo.delete(favorite.id);
    } else {
      const newFavorite = this.productFavorite_repo.create({
        product_id,
        section_id,
        user_id: this.request.user.id,
      });
      return await this.productFavorite_repo.save(newFavorite);
    }
  }

  //* Get All Products Favorite

  async getAllProductsFavorite(productFavQuery: ProductFavQuery) {
    const { page, limit, longitude, latitude, section_id, sort, user_id } =
      productFavQuery;
    const skip = (page - 1) * limit;

    let productsSort = {};

    switch (sort) {
      case 'lowest_price':
        // Convert price to a numeric type before sorting
        (productsSort = 'product_category_prices.price'), 'ASC';
        break;
      case 'highest_price':
        (productsSort = 'product_category_prices.price'), 'DESC';
        break;
      case 'new':
        (productsSort = 'product.created_at'), 'DESC';
        break;
      // handle other sort cases if needed
    }
    // For guests and individuals, orders are taken from the nearest warehouse

    let warehouse: Warehouse;
    if (latitude && longitude) {
      const maxDistanceInMeters = Number((await this.constantRepository.findOne({
        where: {type:ConstantType.MAX_STORAGE_DISTANCE},
      })).variable || 0)*1000;
       warehouse = await this.warehouse_repo
      .createQueryBuilder('warehouse')
      .where('warehouse.is_active = :is_active', { is_active: true })
      .andWhere(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         ) <= :distance`,
        {
          latitude,
          longitude,
          distance: maxDistanceInMeters,
        },
      )
      .orderBy(
        `ST_Distance_Sphere(
           ST_SRID(point(:latitude, :longitude), 4326),
           warehouse.location
         )`,
      )
      .setParameters({ latitude, longitude }) // ensure parameters are reused in orderBy
      .getOne();
    }

    // Start building the query
    let query = this.productFavorite_repo
      .createQueryBuilder('product_favorite')

      .innerJoinAndSelect('product_favorite.product', 'product')
      .innerJoinAndSelect('product_favorite.user', 'user')
      .innerJoinAndSelect('product_favorite.section', 'section')

      .innerJoinAndSelect('product.product_images', 'product_images')
      // .innerJoinAndSelect(
      //   'product.product_sub_categories',
      //   'product_sub_categories',
      // )
      // .innerJoinAndSelect(
      //   'product_sub_categories.category_subCategory',
      //   'product_category_subCategory',
      // )
      // .innerJoinAndSelect(
      //   'product_category_subCategory.section_category',
      //   'product_section_category',
      // )
      .innerJoinAndSelect('product.warehouses_products', 'warehousesProduct')
      .innerJoinAndSelect(
        'product.product_measurements',
        'product_measurements',
      )
      .innerJoinAndSelect(
        'product_measurements.measurement_unit',
        'measurement_unit',
      )
      .innerJoinAndSelect(
        'product_measurements.product_category_prices',
        'product_category_prices',
      )
      .leftJoinAndSelect(
        'product_category_prices.product_offer',
        'product_offer',
        'product_offer.offer_quantity > 0 AND product_offer.start_date <= :current_date AND product_offer.end_date >= :current_date AND product_offer.is_active = :isActive',
        {
          current_date: new Date(),
          isActive: true,
        },
      )
      .innerJoinAndSelect(
        'product_category_prices.product_sub_category',
        'product_sub_category',
      )
      .innerJoinAndSelect(
        'product_sub_category.category_subCategory',
        'category_subCategory',
      )
      .innerJoinAndSelect(
        'category_subCategory.section_category',
        'section_category',
      )

      .orderBy('productSubCategory.order_by', 'ASC')
      .orderBy(productsSort)

      .skip(skip)
      .take(limit);

    // Modify condition if warehouse is defined
  
      query = query.andWhere('warehousesProduct.warehouse_id = :warehouseId', {
        warehouseId: warehouse?.id,
      });
    
    if (user_id) {
      const cartUser = await this.cart_repo.findOne({ where: { user_id } });
      if (!cartUser) {
        throw new NotFoundException('message.user_not_found');
      }

      query = query.leftJoinAndSelect(
        'product_category_prices.cart_products',
        'cart_products',
        'cart_products.cart_id = :cart_id',
        { cart_id: cartUser.id },
      );
      query = query.leftJoinAndSelect('cart_products.cart', 'cart');

      query = query.leftJoinAndSelect(
        'cart_products.product_category_price',
        'cart_product_category_price',
      );
      query = query.leftJoinAndSelect(
        'cart_product_category_price.product_offer',
        'cart_product_offer',
      );

      query = query.leftJoinAndSelect(
        'product.products_favorite',
        'products_favorite',
        'products_favorite.user_id = :user_id',
        { user_id },
      );
    }
    // Conditional where clause based on section
    if (section_id) {
      query = query.andWhere('section_category.section_id = :section_id', {
        section_id,
      });
      query = query.andWhere('product.is_active = true');
      query = query.andWhere('product_sub_category.is_active = true');
      // query = query.andWhere(
      //   'product_section_category.section_id = :section_id',
      //   {
      //     section_id,
      //   },
      // );
    }

    query = query.andWhere('product_favorite.user_id = :user_id', {
      user_id,
    });
    const [products_favorite, total] = await query.getManyAndCount();
    return { products_favorite, total };
  }

  async getBrandCategories(
    brand_id: string,
    section_id: string,
    user_id?: string,
  ) {
    const products = await this.getAllProductsForClient(
      new ProductClientQuery({
        brand_id,
        limit: 1000,
        page: 1,
        section_id,
        sort: 'brand',
        user_id,
      }),
    );

    // return products;
    const categoriesGroupedById = products['products'].reduce(
      (acc: any, product) => {
        product.product_measurements.forEach((subCategory) => {
          const category =
            subCategory.product_category_prices[0].product_sub_category
              .category_subCategory.section_category.category;

          if (!acc.find((item) => item.id == category.id)) {
            acc.push({
              ...category,
              order:
                subCategory.product_category_prices[0].product_sub_category
                  .category_subCategory.section_category.order_by,
              products: [],
            });
          }

          const productResponse = new ProductsNewResponse(product);

          acc
            .find((item) => item.id == category.id)
            .products.push(productResponse);
        });

        return acc;
      },
      [],
    );

    categoriesGroupedById.sort((a, b) => a.order - b.order);

    return categoriesGroupedById;
  }
}
