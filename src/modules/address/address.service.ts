import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { DeleteResult, EntityManager, Repository } from 'typeorm';
import { AddressByAccountRequest } from './dto/requests/address-by-account.request';
import { Address } from 'src/infrastructure/entities/user/address.entity';
import { BaseUserService } from 'src/core/base/service/user-service.base';
import { EntityRelatedValidator } from 'src/core/validators/entity-related.validator';
import { PaginatedRequest } from 'src/core/base/requests/paginated.request';
import {
  applyQueryFilters,
  applyQuerySort,
} from 'src/core/helpers/service-related.helper';
import { SetFavoriteAddressTransaction } from './utils/transactions/set-favorite-address.transaction';
import { WorkingArea } from 'src/infrastructure/entities/working-area/working-area.entity';

@Injectable({ scope: Scope.REQUEST })
export class AddressService extends BaseUserService<Address> {
  constructor(
    @InjectRepository(Address)
    public _repo: Repository<Address>,
    @InjectRepository(WorkingArea)
    public workingArea_repo: Repository<WorkingArea>,
    @Inject(REQUEST) request: Request,
    private entityRelatedValidator: EntityRelatedValidator,
    @Inject(SetFavoriteAddressTransaction)
    private setFavoriteAddressTransaction: SetFavoriteAddressTransaction,
    private context: EntityManager,
  ) {
    super(_repo, request);
  }

  override async findAll(query?: PaginatedRequest): Promise<Address[]> {
    applyQueryFilters(query, `user_id=${super.currentUser.id}`);
    applyQuerySort(query, `is_favorite=desc`);

    return await super.findAll(query);
  }

  override async findOne(id: string): Promise<Address> {
    const item = await super.findOne(id);
    this.entityRelatedValidator.isExist(item);
    this.entityRelatedValidator.ownership(item, super.currentUser);
    return item;
  }
  async findFavorite(user_id: string): Promise<Address> {
    const item = await this._repo.findOneBy({ id: user_id, is_favorite: true });

    return item;
  }

  async findByAccount(query: AddressByAccountRequest): Promise<Address[]> {
    if (!query.account) return [];
    const user = await this.context.query(
      `SELECT * FROM users WHERE account = '${query.account}' LIMIT 1`,
    );
    if (!user[0]) return [];
    return await this._repo.find({ where: { user_id: user[0].id } });
  }

  override async create(entity: Address): Promise<Address> {
    // if entity has property user_id, set it to the current user
    entity.user_id = super.currentUser.id;
    entity.location = `POINT(${entity.latitude} ${entity.longitude})`;
    const valid_location = await this.isLocationWithinWorkingArea(
      entity.latitude,
      entity.longitude,
    );

    if (valid_location == false)
      throw new BadRequestException('message.invalid_location');
    const address = await super.create(entity);
    if (entity.is_favorite) await this.setFavorite(entity.id);

    return address;
  }

  override async update(entity: Address): Promise<Address> {
    // get the entity first
    const user = super.currentUser;
    entity.user_id = user.id;
    const item = await super.findOne(entity.id);
    const valid_location = await this.isLocationWithinWorkingArea(
      entity.latitude,
      entity.longitude,
    );

    if (valid_location == false)
      throw new BadRequestException('message.invalid_location');
    this.entityRelatedValidator.isExist(item);
    this.entityRelatedValidator.ownership(item, super.currentUser);

    // update the entity
    return await super.update(entity);
  }

  override async delete(id: string): Promise<DeleteResult> {
    // get the entity first
    const item = await super.findOne(id);
    if (!item) throw new NotFoundException();
    this.entityRelatedValidator.isExist(item);
    this.entityRelatedValidator.ownership(item, super.currentUser);
    // delete the entity
    return await super.delete(id);
  }

  async setFavorite(id: string): Promise<Address> {
    const item = await super.findOne(id);
    this.entityRelatedValidator.isExist(item);

    this.entityRelatedValidator.ownership(item, super.currentUser);
    await this._repo
      .createQueryBuilder()
      .update('Address')
      .set({ is_favorite: false }) // Replace 'yourColumn' with the actual column name
      .where('user_id = :user_id', { user_id: this.currentUser.id })
      .execute();

    item.is_favorite = true;
    return await super.update(item);
  }

  async removeFavorite(id: string): Promise<Address> {
    const item = await super.findOne(id);
    this.entityRelatedValidator.isExist(item);
    this.entityRelatedValidator.ownership(item, super.currentUser);
    item.is_favorite = false;
    return await super.update(item);
  }
  async isLocationWithinWorkingArea(
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    const workingAreas = await this.workingArea_repo.find({
      where: { is_active: true },
    });

    const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

    for (const area of workingAreas) {
      const latDiff = Math.abs(area.latitude - latitude);
      const longDiff = Math.abs(area.longitude - longitude);

      const distance =
        2 *
        EARTH_RADIUS_KM *
        Math.asin(
          Math.sqrt(
            Math.sin(this.toRadians(latDiff) / 2) *
              Math.sin(this.toRadians(latDiff) / 2) +
              Math.cos(this.toRadians(latitude)) *
                Math.cos(this.toRadians(area.latitude)) *
                Math.sin(this.toRadians(longDiff) / 2) *
                Math.sin(this.toRadians(longDiff) / 2),
          ),
        );

      if (distance <= area.range) {
        return true;
      }
    }
    return false;
  }
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
