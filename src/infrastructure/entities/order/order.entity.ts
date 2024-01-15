import { OwnedEntity } from 'src/infrastructure/base/owned.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Address } from '../user/address.entity';
import { Section } from '../section/section.entity';
import { DeliveryType } from 'src/infrastructure/data/enums/delivery-type.enum';
import { User } from '../user/user.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { PaymentMethod } from 'src/infrastructure/data/enums/payment-method';

import { Slot } from './slot.entity';
import { Shipment } from './shipment.entity';
import { ShipmentStatus } from './shipment-status.entity';
@Entity()
export class Order extends OwnedEntity {
  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn()
  user: User;

  @OneToMany(() => Shipment, (shipment) => shipment.order)
  shipments: Shipment[];

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.orders)
  @JoinColumn()
  warehouse: Warehouse;
  @Column()
  warhouse_id: string;

  @ManyToOne(() => Address, (address) => address.orders)
  @JoinColumn()
  address: Address;

  @Column()
  address_id: string;

  @ManyToOne(() => Section, (section) => section.orders)
  @JoinColumn()
  section: Section;

  @Column()
  section_id: string;

  @Column()
  total_price: number;

  @Column()
  payment_method: PaymentMethod;

  @Column()
  delivery_type: DeliveryType;

  @Column()
  estimated_delivery_time: Date;

  @ManyToOne(() => Slot, (slot) => slot.orders)
  @JoinColumn()
  slot: Slot;

  @Column({ nullable: true })
  slot_id: string;
}