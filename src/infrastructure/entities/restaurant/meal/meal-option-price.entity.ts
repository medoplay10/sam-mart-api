import { AuditableEntity } from 'src/infrastructure/base/auditable.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { OptionGroup } from '../option/option-group.entity';
import { Meal } from './meal.entity';
import { Option } from '../option/option.entity';
import { MealOptionGroup } from './meal-option-group';
import { options } from 'joi';
@Entity()
export class MealOptionPrice extends AuditableEntity {
  @ManyToOne(
    () => MealOptionGroup,
    (mealOptionGroup) => mealOptionGroup.meal_option_prices,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'meal_option_group_id' })
  meal_option_group: MealOptionGroup;
  @Column({ nullable: true })
  meal_option_group_id: string;
  @ManyToOne(() => Option, (options) => options.meal_option_prices)
  @JoinColumn({ name: 'option_id' })
  option: Option;
  @Column({ nullable: true })
  option_id: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ nullable: true })
  order_by: number;

  @Column({ default: false })
  is_default: boolean;
}
