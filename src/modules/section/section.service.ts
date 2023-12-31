import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Section } from 'src/infrastructure/entities/section/section.entity';
import { Any, In, Like, Repository } from 'typeorm';
import { Request } from 'express';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { User } from 'src/infrastructure/entities/user/user.entity';
import { SectionCategory } from 'src/infrastructure/entities/section/section-category.entity';
import { BaseService } from 'src/core/base/service/service.base';
import { CreateSectionRequest } from './dto/requests/create-section.request';
import { ImageManager } from 'src/integration/sharp/image.manager';
import * as sharp from 'sharp';
import { StorageManager } from 'src/integration/storage/storage.manager';
import { plainToInstance } from 'class-transformer';
import { SectionCategoryRequest } from './dto/requests/create-section-category.request';
import { UpdateSectionRequest } from './dto/requests/update-section.request';
import { FileService } from '../file/file.service';
import { UpdateSectionCategoryRequest } from './dto/requests/update-section-category.request';

@Injectable()
export class SectionService extends BaseService<Section> {
  constructor(
    @InjectRepository(Section)
    private readonly section_repo: Repository<Section>,
    @InjectRepository(User) private readonly user_repo: Repository<User>,
    @InjectRepository(SectionCategory)
    private readonly section_category_repo: Repository<SectionCategory>,
    @Inject(StorageManager) private readonly storageManager: StorageManager,
    @Inject(ImageManager) private readonly imageManager: ImageManager,
    @Inject(FileService) private _fileService: FileService,

    @Inject(REQUEST) readonly request: Request,
  ) {
    super(section_repo);
  }

  async getSections(): Promise<Section[]> {
    return await this.section_repo.find();
  }

  async createSection(req: CreateSectionRequest): Promise<Section> {
    const section = this._repo.create(plainToInstance(Section, req));
    if (req.logo) {

const logo=await this._fileService.upload(req.logo)
   
      // set avatar path
      section.logo = logo;
    }
    await this._repo.save(section);
    return section;
  }

  async updateSection(req: UpdateSectionRequest): Promise<Section> {
    const section = await this._repo.findOne({where:{id:req.id}});
    
    if (req.logo) {

    await  this._fileService.delete (section.logo)
      // resize image to 300x300
   const logo=  await this._fileService.upload(req.logo)
   

      // set avatar path
      section.logo = logo;
    }
    await this._repo.update(section.id,{...plainToInstance(Section, req),logo:section.logo});
    return section;
  }

  async getSectionCategories(section_id: string): Promise<SectionCategory[]> {
    return await this.section_category_repo.find({
      where: { section_id ,is_active :true},
      relations: { category: true },
      order: { order_by: 'ASC' },
    });
  }

  async addCategoryToSection(req: SectionCategoryRequest) {
    const section = await this.section_repo.findOne({
      where: { id: req.section_id },
      relations: { section_categories: true },
    });
    if (
      section.section_categories.find((e) => e.category_id === req.category_id)
    ) {
      throw new BadRequestException('category already exist');
    }
    return await this.section_category_repo.save({
      ...req,
    });
  }

  async updatSectionCategory(req:UpdateSectionCategoryRequest){
    return await this.section_category_repo.update(req.id,req)

  }

  async deleteSectionCategory(id:string){
    return await this.section_category_repo.delete(id)
  }
}
