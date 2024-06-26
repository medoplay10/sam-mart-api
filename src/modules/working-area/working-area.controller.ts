import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiHeader } from '@nestjs/swagger';
import { Router } from 'express';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Roles } from '../authentication/guards/roles.decorator';
import { CreateWorkingAreaRequest } from './dto/requests/requests/create-working-area.request';
import { UpdateWorkingAreaRequest } from './dto/requests/requests/update-working-are.request';
import { WorkingAreaService } from './working-area.service';
import { PaginatedRequest } from 'src/core/base/requests/paginated.request';
import { PaginatedResponse } from 'src/core/base/responses/paginated.response';
import { applyQueryIncludes } from 'src/core/helpers/service-related.helper';

@ApiBearerAuth()
@ApiTags("Working-area")
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('working-area')
export class WorkingAreaController {

    constructor(
        private workingAreaService: WorkingAreaService
    ){}

    @Get()
    async getWorkingArea( @Query() query:PaginatedRequest) {
      applyQueryIncludes(query, 'city');
      const workingAreas= await this.workingAreaService.findAll(query);
      if(query.page && query.limit){
       const total=await this.workingAreaService.count(query);
       return new PaginatedResponse(workingAreas,{meta:{total,...query}})
      }
      return new ActionResponse(workingAreas);
    }

    @Get("/:id")
    async getSingleWorkingArea(@Param('id') id: string) {
      return new ActionResponse(await this.workingAreaService.getSingleWorkingArea(id));
    }

  @Post()
  async createWorkingArea(@Body() req: CreateWorkingAreaRequest) {
    return new ActionResponse(await this.workingAreaService.createWorkingArea(req));
  }

  @Put()
  async updateWorkingArea(@Body() req: UpdateWorkingAreaRequest) {
    return new ActionResponse(await this.workingAreaService.updateWorkingArea(req));
  }

  @Delete(':id')
  async deleteWorkingArea(@Param('id') id: string) {
    return new ActionResponse(await this.workingAreaService.deleteWorkingArea(id));
  }




}
