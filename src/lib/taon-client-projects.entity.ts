import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  TaonBaseAbstractEntity,
  TaonBaseEntity,
  TaonEntity,
  UpdateDateColumn,
} from 'taon/src';

import { TaonClientProjectStatus } from './taon-client-project-status';

@TaonEntity({
  className: 'TaonClientProjectsEntity',
  createTable: true,
})
export class TaonClientProjectsEntity extends TaonBaseAbstractEntity<TaonClientProjectsEntity> {
  //#region @websql
  @Index()
  @Column({ type: 'integer' })
  //#endregion
  clientId: number;

  //#region @websql
  @Column({ type: 'varchar', length: 200 })
  //#endregion
  name: string;

  //#region @websql
  @Column({ type: 'varchar', length: 200, nullable: true })
  //#endregion
  contactName: string | null;

  //#region @websql
  @Column({ type: 'text' })
  //#endregion
  description: string;

  //#region @websql
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  //#endregion
  budgetAmount: number | null;

  //#region @websql
  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  //#endregion
  budgetCurrency: string;

  //#region @websql
  @Index()
  @Column({ type: 'varchar', length: 30, default: TaonClientProjectStatus.New })
  //#endregion
  status: TaonClientProjectStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //#region @websql
  @Index()
  @Column({ type: 'datetime', nullable: true })
  //#endregion
  archivedAt: Date | null;

  //#region @websql
  @Column({ type: 'integer', nullable: true })
  //#endregion
  archivedBy: number | null;

  //#region @websql
  @Column({ type: 'datetime', nullable: true })
  //#endregion
  acceptedAt: Date | null;
}
