import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  TaonBaseEntity,
  TaonEntity,
  UpdateDateColumn,
} from 'taon/src';

@TaonEntity({
  className: 'TaonClientProjectActivityEntity',
  createTable: true,
})
export class TaonClientProjectActivityEntity extends TaonBaseEntity<TaonClientProjectActivityEntity> {
  @PrimaryGeneratedColumn()
  id: number;

  //#region @websql
  @Index()
  @Column({ type: 'integer' })
  //#endregion
  projectId: number;

  //#region @websql
  @Index()
  @Column({ type: 'integer' })
  //#endregion
  userId: number;

  //#region @websql
  @Column({ type: 'varchar', length: 40 })
  //#endregion
  activityType:
    | 'comment'
    | 'status-change'
    | 'restored'
    | 'created'
    | 'archived'
    | 'assignment';

  //#region @websql
  @Index()
  @Column({ type: 'boolean', default: false })
  //#endregion
  isRead: boolean;

  //#region @websql
  @Index()
  @Column({ type: 'boolean', default: false })
  //#endregion
  manualUnread: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
