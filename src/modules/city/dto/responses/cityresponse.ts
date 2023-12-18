import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CityResponse {
  @Expose() readonly id: number;
  @Expose() readonly name_ar: string;
  @Expose() readonly name_en: string;
}
