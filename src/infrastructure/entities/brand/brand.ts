import { AuditableEntity } from "src/infrastructure/base/auditable.entity";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { Product } from "../product/product.entity";
@Entity()
export class Brand extends AuditableEntity{
    @Column()
    name_en: string;

    @Column()
    name_ar: string;

    @Column({nullable: true})
    logo: string;

    @Column({nullable:true})
    order:number

    @Column({default:true})
    is_active:boolean


    
    @OneToMany(()=>Product, product => product.brand)
    products: Product[]

}