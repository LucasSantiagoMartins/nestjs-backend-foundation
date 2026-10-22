import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Subscription, (subscription) => subscription.payments, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: string;
  @Column({ type: 'varchar', length: 3 }) currency: string;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.STRIPE })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 120,
    nullable: true,
    unique: true,
  })
  providerReference: string | null;

  @Column({ type: 'jsonb', nullable: true }) metadata: Record<
    string,
    unknown
  > | null;
  @Column({
    name: 'failure_email_queued_at',
    type: 'timestamptz',
    nullable: true,
  })
  failureEmailQueuedAt: Date | null;
  @Column({
    name: 'success_email_queued_at',
    type: 'timestamptz',
    nullable: true,
  })
  successEmailQueuedAt: Date | null;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
