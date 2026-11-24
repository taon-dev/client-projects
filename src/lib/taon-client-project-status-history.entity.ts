import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  TaonBaseEntity,
  TaonEntity,
} from 'taon/src';

import { TaonClientProjectStatus } from './taon-client-project-status';

@TaonEntity({
  className: 'TaonClientProjectStatusHistoryEntity',
  createTable: true,
})
export class TaonClientProjectStatusHistoryEntity extends TaonBaseEntity<TaonClientProjectStatusHistoryEntity> {
  @PrimaryGeneratedColumn()
  id: number;

  //#region @websql
  @Index()
  @Column({ type: 'integer' })
  //#endregion
  projectId: number;

  //#region @websql
  @Column({ type: 'varchar', length: 30 })
  //#endregion
  previousStatus: TaonClientProjectStatus;

  //#region @websql
  @Column({ type: 'varchar', length: 30 })
  //#endregion
  newStatus: TaonClientProjectStatus;

  //#region @websql
  @Column({ type: 'integer' })
  //#endregion
  administratorId: number;

  //#region @websql
  @Column({ type: 'integer' })
  //#endregion
  commentId: number;

  @CreateDateColumn()
  createdAt: Date;
}
