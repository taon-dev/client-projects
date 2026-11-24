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
  className: 'TaonClientProjectCommentEntity',
  createTable: true,
})
export class TaonClientProjectCommentEntity extends TaonBaseEntity<TaonClientProjectCommentEntity> {
  @PrimaryGeneratedColumn()
  id: number;

  //#region @websql
  @Index()
  @Column({ type: 'integer' })
  //#endregion
  projectId: number;

  //#region @websql
  @Column({ type: 'integer' })
  //#endregion
  authorId: number;

  //#region @websql
  @Column({ type: 'varchar', length: 20 })
  //#endregion
  authorType: 'client' | 'administrator';

  //#region @websql
  @Column({ type: 'text' })
  //#endregion
  body: string;

  //#region @websql
  @Column({ type: 'boolean', default: false })
  //#endregion
  statusChange: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  //#region @websql
  @Column({ type: 'datetime', nullable: true })
  //#endregion
  deletedAt: Date | null;
}
