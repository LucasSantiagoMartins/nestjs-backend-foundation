import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity('plans')
export class Plan {
  @OneToMany(() => Subscription, (subscription) => subscription.plan)
  subscriptions?: Subscription[];
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // PostgreSQL DECIMAL values are represented as strings to preserve precision.
  @Column({ name: 'monthly_price', type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: string;

  @Column({
    name: 'yearly_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  yearlyPrice: string | null;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  benefits: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
