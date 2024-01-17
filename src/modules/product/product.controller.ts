import {
  Body,
  ClassSerializerInterceptor,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { CreateProductRequest } from './dto/request/create-product.request';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ActionResponse } from 'src/core/base/responses/action.response';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { plainToClass, plainToInstance } from 'class-transformer';
import { ProductResponse } from './dto/response/product.response';
import { UpdateProductRequest } from './dto/request/update-product.request';
import { UpdateProductMeasurementRequest } from './dto/request/update-product-measurement.request';
import { ProductsDashboardQuery } from './dto/filter/products-dashboard.query';
import { CreateProductOfferRequest } from './dto/request/create-product-offer.request';
import { SingleProductRequest } from './dto/request/single-product.request';
import { ProductWarehouseResponse } from './dto/response/product-warehouse.response';
import { PageMetaDto } from 'src/core/helpers/pagination/page-meta.dto';
import { PageDto } from 'src/core/helpers/pagination/page.dto';
import { CreateSingleImageRequest } from './dto/request/product-images/create-single-image.request';
import { UpdateSingleImageRequest } from './dto/request/product-images/update-single-image.request';
import { CreateProductMeasurementRequest } from './dto/request/create-product-measurement.request';
import { ProductClientQuery } from './dto/filter/products-client.query';
import { SingleProductClientQuery } from './dto/filter/single-product-client.query';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Roles } from '../authentication/guards/roles.decorator';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Response } from 'express';
import { ImportCategoryRequest } from '../category/dto/requests/import-category-request';
import { UploadValidator } from 'src/core/validators/upload.validator';
@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) { }

  @Post('create-product')
  async createProduct(@Body() createProductRequest: CreateProductRequest) {
    const product = await this.productService.createProduct(
      createProductRequest,
    );
    const productResponse = plainToClass(ProductResponse, product);

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }

  @Post('create-product-offer/:product_category_price_id')
  async createProductOffer(
    @Param('product_category_price_id') product_category_price_id: string,
    @Body() createProductOfferRequest: CreateProductOfferRequest,
  ) {
    const product = await this.productService.createProductOffer(
      product_category_price_id,
      createProductOfferRequest,
    );
    return new ActionResponse(product);
  }

  @Post('add-image-to-product/:product_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async addImageToProduct(
    @Param('product_id') id: string,
    @Body() createSingleImageRequest: CreateSingleImageRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    createSingleImageRequest.file = file;
    const product = await this.productService.addProductImage(
      id,
      createSingleImageRequest,
    );
    return new ActionResponse(product);
  }

  @Post('add-measurement-to-product/:product_id')
  async addMeasurementToProduct(
    @Param('product_id') product_id: string,
    @Body() createProductMeasurementRequest: CreateProductMeasurementRequest,
  ) {
    const product = await this.productService.addProductMeasurement(
      product_id,
      createProductMeasurementRequest,
    );
    return new ActionResponse(product);
  }

  @Put('update-product/:product_id')
  async updateProduct(
    @Param('product_id') product_id: string,
    @Body() updateProductRequest: UpdateProductRequest,
  ) {
    const product = await this.productService.updateProduct(
      product_id,
      updateProductRequest,
    );
    const productResponse = plainToClass(ProductResponse, product);

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }
  @Put('update-product-measurement/:product_id/:product_measurement_unit_id')
  async updateProductMeasurement(
    @Param('product_id') product_id: string,
    @Param('product_measurement_unit_id') product_measurement_unit_id: string,
    @Body() updateProductMeasurementRequest: UpdateProductMeasurementRequest,
  ) {
    const product = await this.productService.updateProductMeasurement(
      product_id,
      product_measurement_unit_id,
      updateProductMeasurementRequest,
    );
    return new ActionResponse(product);
  }

  @Put('update-product-image/:product_id/:image_id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateProductImage(
    @Param('product_id') product_id: string,
    @Param('image_id') image_id: string,
    @Body() updateSingleImageRequest: UpdateSingleImageRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    updateSingleImageRequest.file = file;
    const product = await this.productService.updateProductImage(
      product_id,
      image_id,
      updateSingleImageRequest,
    );
    return new ActionResponse(product);
  }

  @Get('all-products-for-client')
  async allProductsForClient(@Query() productClientFilter: ProductClientQuery) {
    const { limit, page } = productClientFilter;

    const { products, total } =
      await this.productService.getAllProductsForClient(productClientFilter);
    const productsResponse = products.map((product) => {
      const productResponse = plainToClass(ProductResponse, product);
      productResponse.totalQuantity = product.warehouses_products.reduce(
        (acc, cur) => acc + cur.quantity,
        0,
      );

      productResponse.order_by = product.product_sub_categories[0].order_by;
      return productResponse;
    });
    const pageMetaDto = new PageMetaDto(page, limit, total);
    const data = this._i18nResponse.entity(productsResponse);
    const pageDto = new PageDto(data, pageMetaDto);

    return new ActionResponse(pageDto);
  }
  @Get('all-products-offers-for-client')
  async allProductsOffersForClient(
    @Query() productClientFilter: ProductClientQuery,
  ) {
    const { limit, page } = productClientFilter;

    const { products, total } =
      await this.productService.getAllProductsOffersForClient(
        productClientFilter,
      );
    const productsResponse = products.map((product) => {
      const productResponse = plainToClass(ProductResponse, product);
      productResponse.totalQuantity =
        productResponse.warehouses_products.reduce(
          (acc, cur) => acc + cur.quantity,
          0,
        );
      return productResponse;
    });
    const pageMetaDto = new PageMetaDto(page, limit, total);
    const data = this._i18nResponse.entity(productsResponse);
    const pageDto = new PageDto(data, pageMetaDto);

    return new ActionResponse(pageDto);
  }

  @Get('all-products-for-dashboard')
  async allProductsForDashboard(
    @Query() productsDashboardQuery: ProductsDashboardQuery,
  ) {
    const { limit, page } = productsDashboardQuery;

    const { products, total } =
      await this.productService.getAllProductsForDashboard(
        productsDashboardQuery,
      );
    const productsResponse = products.map((product) => {
      const productResponse = plainToClass(ProductResponse, product);
      productResponse.totalQuantity =
        productResponse.warehouses_products.reduce(
          (acc, cur) => acc + cur.quantity,
          0,
        );
      return productResponse;
    });
    const pageMetaDto = new PageMetaDto(page, limit, total);
    const data = this._i18nResponse.entity(productsResponse);
    const pageDto = new PageDto(data, pageMetaDto);

    return new ActionResponse(pageDto);
  }

  @Get('all-products-offers-for-dashboard')
  async allProductsOffersForDashboard(
    @Query() productsDashboardQuery: ProductsDashboardQuery,
  ) {
    const { limit, page } = productsDashboardQuery;

    const { products, total } =
      await this.productService.getAllProductsOffersForDashboard(
        productsDashboardQuery,
      );
    const productsResponse = products.map((product) => {
      const productResponse = plainToClass(ProductResponse, product);
      productResponse.totalQuantity =
        productResponse.warehouses_products.reduce(
          (acc, cur) => acc + cur.quantity,
          0,
        );
      return productResponse;
    });
    const pageMetaDto = new PageMetaDto(page, limit, total);
    const data = this._i18nResponse.entity(productsResponse);
    const pageDto = new PageDto(data, pageMetaDto);

    return new ActionResponse(pageDto);
  }

  @Get('single-product-client/:product_id')
  async singleProductClient(
    @Param('product_id') id: string,
    @Query() singleProductClientQuery: SingleProductClientQuery,
  ) {
    const product = await this.productService.getSingleProductForClient(
      id,
      singleProductClientQuery,
    );
    const productResponse = plainToClass(ProductResponse, product);
    if (productResponse?.warehouses_products == null) {
      throw new ConflictException('Product is not available In Warehouse');
    } else {
      productResponse.totalQuantity =
        productResponse.warehouses_products.reduce(
          (acc, cur) => acc + cur.quantity,
          0,
        );
    }

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }

  @Get('single-product-dashboard/:product_id')
  async singleProductDashboard(@Param('product_id') id: string) {
    const product = await this.productService.getSingleProductForDashboard(id);
    const productResponse = plainToClass(ProductResponse, product);
    if (productResponse.warehouses_products) {
      productResponse.totalQuantity =
        productResponse.warehouses_products.reduce(
          (acc, cur) => acc + cur.quantity,
          0,
        );
    }

    return new ActionResponse(this._i18nResponse.entity(productResponse));
  }

  @Delete('delete-Product/:product_id')
  async deleteProduct(@Param('product_id') id: string) {
    const product = await this.productService.deleteProduct(id);
    return new ActionResponse(product);
  }

  @Delete('delete-Product-image/:product_id/:image_id')
  async deleteProductImage(
    @Param('product_id') product_id: string,
    @Param('image_id') image_id: string,
  ) {
    const product = await this.productService.deleteProductImage(
      product_id,
      image_id,
    );
    return new ActionResponse(product);
  }
  @Delete('delete-Product-measurement/:product_id/:product_measurement_id')
  async deleteProductMeasurement(
    @Param('product_id') product_id: string,
    @Param('product_measurement_id') product_measurement_id: string,
  ) {
    const product = await this.productService.deleteProductMeasurement(
      product_id,
      product_measurement_id,
    );
    return new ActionResponse(product);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get("/export")
  @Header('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportProducts(@Res() res: Response) {
    const File = await this.productService.exportProducts();
    res.download(`${File}`);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(ClassSerializerInterceptor, FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Post('import')
  async importProducts(
    @Body() req: ImportCategoryRequest,
    @UploadedFile(new UploadValidator().build())
    file: Express.Multer.File
  ) {
    req.file = file;
    const products = await this.productService.importProducts(req);
    return new ActionResponse(products);
  }

}
