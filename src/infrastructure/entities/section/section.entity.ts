import { BaseEntity } from 'src/infrastructure/base/base.entity';
import { DeliveryType } from 'src/infrastructure/data/enums/delivery-type.enum';
import { Column, Entity, OneToMany } from 'typeorm';
import { SectionCategory } from './section-category.entity';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { Order } from '../order/order.entity';
import { ProductFavorite } from '../product/product-favorite.entity';

@Entity()
export class Section extends BaseEntity {
  @Column()
  name_ar: string;

  @Column()
  name_en: string;

  @Column()
  logo: string;

  @Column()
  
  order_by: number;

  @Column('decimal', { precision: 10, scale: 2 })
  min_order_price: number;

  @Column({ type: 'set', enum: Role, default: [Role.CLIENT] })
  allowed_roles: Role[];

  @Column({ default: true })
  is_active: boolean;

  @Column('decimal', { precision: 10, scale: 2 })
  delivery_price: number;

  @Column({
    type: 'simple-array',

   
    nullable:true
  })
  delivery_type: string;

  @OneToMany(() => Order, (order) => order.warehouse)
  orders: Order[];

  @OneToMany(
    () => SectionCategory,
    (sction_category) => sction_category.section,
  )
  section_categories: SectionCategory[];

  @OneToMany(
    () => ProductFavorite,
    (productFavorite) => productFavorite.section,
  )
  products_favorite: ProductFavorite[];
}
