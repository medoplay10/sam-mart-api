import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetNearResturantsQuery, GetNearResturantsQuerySearch } from './dto/requests/get-near-resturants.query';
import { RestaurantService } from './restaurant.service';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { plainToInstance } from 'class-transformer';
import { MealOfferResponse, MealResponse } from './dto/responses/meal.response';
import { RestaurantResponse } from './dto/responses/restaurant.response';
import { RegisterRestaurantRequest } from './dto/requests/register-restaurant.request';
import { CuisineResponse } from './dto/responses/cuisine.response';
import { AddRestaurantCategoryRequest } from './dto/requests/add-restaurant-category.request';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Roles } from '../authentication/guards/roles.decorator';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@ApiTags('Restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) {}

  @Post('/register')
  async register(@Body() req: RegisterRestaurantRequest) {
    const restaurant = await this.restaurantService.register(req);

    return new ActionResponse(restaurant);
  }
  @Get('/nearby')
  async getNearResturants(@Query() query: GetNearResturantsQuery) {
    const restaurants = await this.restaurantService.findAllNearRestaurantsCusine(
      query,
    );
    const response = this._i18nResponse.entity(restaurants);

    return new ActionResponse(response);
  }
  @Get('/search')
  async getNearResturantsSearch(@Query() query: GetNearResturantsQuerySearch) {
    const restaurants = await this.restaurantService.findAllNearRestaurantsCusineMeals(
      query,
    );
    const response = this._i18nResponse.entity(restaurants);

    return new ActionResponse(response);
  }
  @Get('/nearby-groups')
  async getNearResturantsGroups(@Query() query: GetNearResturantsQuery) {
    const restaurants = await this.restaurantService.findAllNearRestaurantsGroup(
      query,
    );
    const response = this._i18nResponse.entity(restaurants);

    return new ActionResponse(response);
  }

  @Get('/top-seller-meals')
  async getTopSellerMeals(@Query() query: GetNearResturantsQuery) {
    const meals = await this.restaurantService.getTopSellerMeals(query);
    const response = this._i18nResponse.entity(
      plainToInstance(MealResponse, meals, { excludeExtraneousValues: true }),
    );

    return new ActionResponse(response);
  }

  @Get('/details/:id')
  async getSingleRestaurant(
    @Param('id') id: string,
    @Query('user_id') user_id?: string,
  ) {
    const restaurant = await this.restaurantService.getSingleRestaurant(
      id,
      user_id,
    );
    const response = this._i18nResponse.entity(restaurant);
    return new ActionResponse(response);
  }

  @Get('/meal/details/:id')
  async getSingleMeal(@Param('id') id: string,@Query('user_id') user_id?: string) { 
    const meal = await this.restaurantService.getSingleMeal(id,user_id);
    const response = this._i18nResponse.entity(meal);
    return new ActionResponse(response);
  }

  @Get('/cuisines')
  async getCuisineTypes() {
    const cuisines = await this.restaurantService.getCuisineTypes();
    const response = plainToInstance(CuisineResponse, cuisines, {
      excludeExtraneousValues: true,
    });
    return new ActionResponse(response);
  }
  @Get('/groups')
  async getRestaurantGroups() {
    const gropus = await this.restaurantService.getRestaurantGroups();
    const response = plainToInstance(CuisineResponse, gropus, {
      excludeExtraneousValues: true,
    });
    return new ActionResponse(response);
  }

  @Get('/meals-offers/:restaurant_id')
  async getMealsOffers(@Param('restaurant_id') restaurant_id: string) {
    const meals = await this.restaurantService.getMealsOffers(restaurant_id);
    const translatedMeals = await this._i18nResponse.entity(meals);
    const response = plainToInstance(MealResponse, translatedMeals, {
      excludeExtraneousValues: true,
    })
    return new ActionResponse(response);
  }
  // @Roles(Role.CLIENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/favorite-meal/:meal_id')
  async favoriteMeal(
    @Param('meal_id') meal_id: string,
  ) {
    const meal = await this.restaurantService.addFavoriteMeal(meal_id,);
    return new ActionResponse(meal);
  }
  // @Roles(Role.CLIENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/favorite-meals')
  async getFavoriteMeals(@Query() query: GetNearResturantsQuery) {
    const favoriteMeals = await this.restaurantService.getNearbyFavoriteMeals(query);
    return new ActionResponse(this._i18nResponse.entity(favoriteMeals));
  }
}
