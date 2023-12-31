import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseBoolPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication/guards/jwt-auth.guard';
import { I18nResponse } from 'src/core/helpers/i18n.helper';
import { RolesGuard } from '../authentication/guards/roles.guard';
import { UserService } from './user.service';

import { Request } from 'express';

import { REQUEST } from '@nestjs/core';

import { UpdateProfileRequest } from './dto/requests/update-profile.request';

import {
  ProfileResponse,
  UserInfoResponse,
} from './dto/responses/profile.response';
import { UploadValidator } from 'src/core/validators/upload.validator';

import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateFcmRequest } from './dto/requests/update-fcm.request';
import { ActionResponse } from 'src/core/base/responses/action.response';
import { UpdateLanguageRequest } from './dto/requests/update-language.request';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Roles } from '../authentication/guards/roles.decorator';



@ApiBearerAuth()
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description: 'Language header: en, ar',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(
    private readonly _service: UserService,
    @Inject(REQUEST) readonly request: Request,
    @Inject(I18nResponse) private readonly _i18nResponse: I18nResponse,
  ) {}

  @Put('allow-notification/:allow_notification')
  async allowNotification(
    @Param('allow_notification') allow_notification: boolean,
  ) {
    return new ActionResponse( await this._service.allowNotification(allow_notification));
  }



 @Roles(Role.ADMIN)
  @Put('make-resturant')
async makeResturant(@Body() id:string){

const user= await this._service.findOne(id)
user.roles.push(Role.RESTURANT)
return new ActionResponse( await this._service.update(user))

}
}
