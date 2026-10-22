import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { User } from '../../user/entities/user.entity';
import { Payment } from './payment.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { BillingPeriod } from '../enums/billing-period.enum';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => User, (user) => user.subscriptions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;
  @Column({ name: 'billing_period', type: 'enum', enum: BillingPeriod })
  billingPeriod: BillingPeriod;
  @ManyToOne(() => Plan, (plan) => plan.subscriptions, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING_PAYMENT,
  })
  status: SubscriptionStatus;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;
  @OneToMany(() => Payment, (payment) => payment.subscription)
  payments: Payment[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
