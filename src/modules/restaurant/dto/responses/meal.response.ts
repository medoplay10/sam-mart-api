import { Expose, plainToInstance, Transform } from "class-transformer";
import { toUrl } from "src/core/helpers/file.helper";
import { MealOptionGroup } from "src/infrastructure/entities/restaurant/meal-option-group";
import { OptionGroup } from "src/infrastructure/entities/restaurant/option-group.entity";
import { OptionGroupResponse } from "./option.resonse";

export class MealResponse {
    @Expose()
    id: string;
    @Expose()
    name_ar: string;
    @Expose()
    name_en: string;
    @Expose()
    description_ar: string;
    @Expose()
    description_en: string;
    @Expose()
    price: number;
    @Expose()
    @Transform(({ value }) => toUrl(value)) 
    image: string;
    @Expose()
    @Transform(( value ) => {
    
        if (value.obj.restaurant_category && typeof value.obj.restaurant_category === 'object') {
          return {
            id: value.obj.restaurant_category.id,
            name_ar: value.obj.restaurant_category.name_ar,
            name_en: value.obj.restaurant_category.name_en,
            restaurant_id: value.obj.restaurant_category.restaurant_id,
          };
        }
        return null; // Handle cases where `value` is null or not an object
      })
      restaurant_category: any;

      @Expose()
      @Transform((value)=>{return value.obj.meal_option_groups?.map((item:MealOptionGroup)=>plainToInstance(OptionGroupResponse,item.option_group,{excludeExtraneousValues:true}))})
      option_groups:OptionGroupResponse
}