import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Category } from './category.entity';
import { BaseEntity } from 'src/infrastructure/base/base.entity';
import { CategorySubCategory } from './category-subcategory.entity';
import { ProductSubCategory } from '../product/product-sub-category.entity';

@Entity()
export class Subcategory extends BaseEntity {
  @Column()
  name_ar: string;
  @Column()
  name_en: string;
  @Column()
  logo: string;

  @OneToMany(
    () => CategorySubCategory,
    (categorySubCategory) => categorySubCategory.subcategory,
    { onDelete: 'CASCADE' },
  )
  category_subCategory: CategorySubCategory[];

  constructor(partial?: Partial<Subcategory>) {
    super();
    Object.assign(this, partial);
  }
}
