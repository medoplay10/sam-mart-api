import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  Put,
  Delete,
  Inject,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { Country } from 'src/infrastructure/entities/country/country.entity';

import { plainToClass } from 'class-transformer';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { RegionService } from './region.service';
import { CreateRegionRequest } from './dto/requests/create-region.request';
import { Region } from 'src/infrastructure/entities/region/region.entity';
import { RegionResponse } from './dto/responses/region.response';
import { UpdateRegionRequest } from './dto/requests/update-region.request';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Roles } from '../authentication/guards/roles.decorator';

@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@ApiTags('Region')
@Controller('region')
export class RegionController {
  constructor(
    private readonly regionService: RegionService,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) {}
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('create-region')
  async create(@Body() createRegionRequest: CreateRegionRequest) {
    return new ActionResponse(
      await this.regionService.create(createRegionRequest),
    );
  }

  @Get(':region_id/single-region')
  async single(@Param('region_id') id: string) {
    const region = await this.regionService.single(id);
    const regionResponse = plainToClass(RegionResponse, region);
    return new ActionResponse(this._i18nResponse.entity(regionResponse));
  }

  @Get(':city_id/all-regions')
  async allRegions(@Param('city_id') id: string) {
    const regions = await this.regionService.allRegionsCity(id);
    const regionsResponse = regions.map((region) =>
      plainToClass(RegionResponse, region),
    );
    return new ActionResponse(this._i18nResponse.entity(regionsResponse));
  }

  @Get(':region_id/single-region-dashboard')
  async singleDashboard(@Param('region_id') id: string) {
    const region = await this.regionService.single(id);
    const regionResponse = plainToClass(RegionResponse, region);
    return new ActionResponse(regionResponse);
  }

  @Get(':city_id/all-regions-dashboard')
  async allRegionsDashboard(@Param('city_id') id: string) {
    const regions = await this.regionService.allRegionsCity(id);
    const regionsResponse = regions.map((region) =>
      plainToClass(RegionResponse, region),
    );
    return new ActionResponse(regionsResponse);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':region_id/update-region')
  async update(
    @Param('region_id') id: string,
    @Body() updateRegionRequest: UpdateRegionRequest,
  ) {
    return new ActionResponse(
      await this.regionService.update(id, updateRegionRequest),
    );
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':region_id/delete-region')
  async delete(@Param('region_id') id: string) {
    return new ActionResponse(await this.regionService.delete(id));
  }
}
