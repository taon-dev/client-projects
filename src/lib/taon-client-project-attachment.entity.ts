import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  TaonBaseEntity,
  TaonEntity,
} from 'taon/src';

@TaonEntity({
  className: 'TaonClientProjectAttachmentEntity',
  createTable: true,
})
export class TaonClientProjectAttachmentEntity extends TaonBaseEntity<TaonClientProjectAttachmentEntity> {
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
  uploadedBy: number;

  //#region @websql
  @Column({ type: 'varchar', length: 500 })
  //#endregion
  storageKey: string;

  //#region @websql
  @Column({ type: 'varchar', length: 300 })
  //#endregion
  fileName: string;

  //#region @websql
  @Column({ type: 'varchar', length: 100, nullable: true })
  //#endregion
  mimeType: string | null;

  //#region @websql
  @Column({ type: 'integer', nullable: true })
  //#endregion
  sizeBytes: number | null;

  //#region @websql
  @Column({ type: 'datetime', nullable: true })
  //#endregion
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
