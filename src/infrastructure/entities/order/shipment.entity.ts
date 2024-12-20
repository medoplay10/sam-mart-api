import { AuditableEntity } from 'src/infrastructure/base/auditable.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Driver } from '../driver/driver.entity';
import { Order } from './order.entity';
import { Warehouse } from '../warehouse/warehouse.entity';
import { ShipmentProduct } from './shipment-product.entity';
import { ShipmentStatusEnum } from 'src/infrastructure/data/enums/shipment_status.enum';
import { ShipmentChat } from './shipment-chat.entity';
import { ShipmentFeedback } from './shipment-feedback.entity';
import { Reason } from '../reason/reason.entity';
import { Role } from 'src/infrastructure/data/enums/role.enum';
import { ShipmentProductHistory } from './shipment-product-history.entity';

@Entity()
export class Shipment extends AuditableEntity {
  @OneToOne(() => ShipmentFeedback, (orderFeedback) => orderFeedback.shipment)
  order_feedback: ShipmentFeedback;
  @ManyToOne(() => Driver, (driver) => driver.shipments)
  driver: Driver;
  @Column({ nullable: true })
  driver_id: string;

  @ManyToOne(() => Order, (Order) => Order.shipments)
  order: Order;

  @Column()
  order_id: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.shipments)
  warehouse: Warehouse;

  @Column()
  warehouse_id: string;

  @Column({ default: ShipmentStatusEnum.PENDING })
  status: ShipmentStatusEnum;

  @ManyToOne(() => Reason, reason => reason.cancelShipment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancel_reason_id' })
  cancelShipmentReason: Reason;

  @Column({ nullable: true })
  cancel_reason_id: string;

  @Column({ type: 'enum', enum: Role, nullable: true })
  canceled_by: Role;

  @Column({ nullable: true })
  order_confirmed_at: Date;

  @Column({ nullable: true })
  order_on_processed_at: Date;

  @Column({ nullable: true })
  order_ready_for_pickup_at: Date;

  @Column({ nullable: true })
  order_shipped_at: Date;

  @Column({ nullable: true })
  order_delivered_at: Date;

  @Column({ nullable: true })
  order_canceled_at: Date;

  @OneToMany(
    () => ShipmentProduct,
    (shipmentProduct) => shipmentProduct.shipment,
  )
  shipment_products: ShipmentProduct[];

  @OneToMany(() => ShipmentChat, (shipmentChat) => shipmentChat.shipment, {
    cascade: true,
  })
  shipment_chats: ShipmentChat[];

  @OneToMany(() => ShipmentProductHistory, (shipmentProductHistory) => shipmentProductHistory.shipment)
  shipment_product_histories: ShipmentProductHistory[];

  constructor(partial?: Partial<Shipment>) {
    super();
    Object.assign(this, partial);
  }
}
