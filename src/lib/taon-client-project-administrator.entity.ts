import {
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  TaonBaseEntity,
  TaonEntity,
} from 'taon/src';

@Index('uq_project_administrator', ['projectId', 'administratorId'], { unique: true })
@TaonEntity({
  className: 'TaonClientProjectAdministratorEntity',
  createTable: true,
})
export class TaonClientProjectAdministratorEntity extends TaonBaseEntity<TaonClientProjectAdministratorEntity> {
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
  administratorId: number;

  //#region @websql
  @Column({ type: 'integer' })
  //#endregion
  assignedBy: number;

  @CreateDateColumn()
  createdAt: Date;
}
