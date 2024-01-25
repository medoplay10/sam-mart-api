import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/core/base/service/service.base';
import { CartProduct } from 'src/infrastructure/entities/cart/cart-products';
import { Cart } from 'src/infrastructure/entities/cart/cart.entity';
import { Repository } from 'typeorm/repository/Repository';
import { AddToCartRequest } from './dto/requests/add-to-cart-request';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Product } from 'src/infrastructure/entities/product/product.entity';
import { ProductCategoryPrice } from 'src/infrastructure/entities/product/product-category-price.entity';
import { In } from 'typeorm';
import { calculateSum } from 'src/core/helpers/cast.helper';
import { UpdateCartProductRequest } from './dto/requests/update-cart-request';
import { AddRemoveCartProductServiceRequest } from './dto/requests/add-remove-service-request';

@Injectable()
export class CartService extends BaseService<CartProduct> {
  constructor(
    @InjectRepository(CartProduct)
    private cartProductRepository: Repository<CartProduct>,
    @InjectRepository(Cart) private cartRepository: Repository<Cart>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(ProductCategoryPrice)
    private productCategoryPrice: Repository<ProductCategoryPrice>,

    @Inject(REQUEST) readonly request: Request,
  ) {
    super(cartProductRepository);
  }

  async getCart() {
    return await this.cartRepository.findOne({
      where: { user_id: this.request.user.id },
    });
  }

  async getCartProducts(cart_id: string) {
    return await this.cartProductRepository.find({
      where: { cart_id: cart_id },
      relations: {
        product_category_price: {
          product_additional_services: { additional_service: true },

          product_measurement: { measurement_unit: true },

          product_sub_category: {
            product: { product_images: true },
            category_subCategory: { section_category: true },
          },
        },
      },
    });
  }

  async addToCart(req: AddToCartRequest) {
    const cart = await this.getCart();
    const additions = req.additions || [];
    console.log(additions);
    const product_price = await this.productCategoryPrice.findOne({
      where: {
        id: req.product_category_price_id,
        product_additional_services: {
          id: additions.length != 0 ? In(additions) : null,
        },
      },
      relations: {
        product_measurement: true,
        product_offer: true,
        product_additional_services: true,
        product_sub_category: {
          category_subCategory: { section_category: true },
        },
      },
    });

    if (product_price.product_offer != null) {
      product_price.min_order_quantity =
        product_price.product_offer.min_offer_quantity;
      product_price.max_order_quantity =
        product_price.product_offer.max_offer_quantity;
      product_price.price = product_price.product_offer.price;
    }

    if (additions.length > 0) {
      const additional_cost = calculateSum(
        product_price.product_additional_services.map((e) => {
          return Number(e.price);
        }),
      );
      product_price.price =
        Number(product_price.price) + Number(additional_cost);
    }
    const cart_product = await this.cartProductRepository.findOne({
      where: {
        cart_id: cart.id,
        product_category_price_id: req.product_category_price_id,
      },
    });
    if (cart_product) {
      this.cartProductRepository.remove(cart_product);
    }
    return this.cartProductRepository.save(
      new CartProduct({
        additions: additions,
        cart_id: cart.id,
        section_id:
          product_price.product_sub_category.category_subCategory
            .section_category.section_id,
        quantity: product_price.min_order_quantity,
        product_id: product_price.product_sub_category.product_id,
        product_category_price_id: req.product_category_price_id,
        price: product_price.price,
        conversion_factor: product_price.product_measurement.conversion_factor,
        main_measurement_id:
          product_price.product_measurement.is_main_unit == true
            ? product_price.product_measurement.measurement_unit_id
            : product_price.product_measurement.base_unit_id,
      }),
    );
  }

  async deleteCartProduct(cart_product_id: string) {
    return await this.cartProductRepository.delete({
      id: cart_product_id,
    });
  }

  async updatecartProduct(req: UpdateCartProductRequest) {
    const cart_product = await this.cartProductRepository.findOne({
      where: { id: req.cart_product_id },
    });
    const product_category_price = await this.productCategoryPrice.findOne({
      where: { id: cart_product.product_category_price_id },
      relations: {
        product_measurement: true,
        product_offer: true,
        product_additional_services: true,
        product_sub_category: {
          category_subCategory: { section_category: true },
        },
      },
    });
    if (product_category_price.product_offer != null) {
      product_category_price.min_order_quantity =
        product_category_price.product_offer.min_offer_quantity;
      product_category_price.max_order_quantity =
        product_category_price.product_offer.max_offer_quantity;
      product_category_price.price = product_category_price.product_offer.price;
    }
    if (req.add == true) {
      if (
        cart_product.quantity + product_category_price.min_order_quantity >=
        product_category_price.max_order_quantity
      )
        cart_product.quantity = product_category_price.max_order_quantity;
else
      cart_product.quantity += product_category_price.min_order_quantity;
    } else {
      if (
        cart_product.quantity - product_category_price.min_order_quantity <=
        product_category_price.min_order_quantity
      )
        cart_product.quantity = product_category_price.min_order_quantity;
        else
      cart_product.quantity -= product_category_price.min_order_quantity;
    }

    return {
      ...(await this.cartProductRepository.save(cart_product)),
      min_order_quantity: product_category_price.min_order_quantity,
      max_order_quantity: product_category_price.max_order_quantity,
    };
  }

  async addRemoveService(req: AddRemoveCartProductServiceRequest) {
    const cart_product = await this.cartProductRepository.findOne({
      where: { id: req.cart_product_id },
    });
    const product_category_price = await this.productCategoryPrice.findOne({
      where: { id: cart_product.product_category_price_id },
      relations: {
        product_measurement: true,
        product_offer: true,
        product_additional_services: true,
        product_sub_category: {
          category_subCategory: { section_category: true },
        },
      },
    });

    if (req.additions && req.additions.length > 0) {
      cart_product.price = Number(cart_product.price);
      req.additions.forEach((e) => {
        const service = product_category_price.product_additional_services.find(
          (s) => s.id == e,
        );

        if (cart_product.additions.includes(e)) {
          const index = cart_product.additions.indexOf(e);
          if (index > -1) {
            cart_product.additions.splice(index, 1);

            cart_product.price -= Number(service.price);
          }
        } else {
          cart_product.additions.push(e);
          cart_product.price += Number(service.price);
        }
      });
    }
    return this.cartProductRepository.save(cart_product);
  }
}
