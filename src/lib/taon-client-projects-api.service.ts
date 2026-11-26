import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TaonBaseAngularService } from 'taon/src';

import type { TaonClientProjectCommentEntity } from './taon-client-project-comment.entity';
import type { TaonClientProjectStatus } from './taon-client-project-status';
import { TaonClientProjectsController } from './taon-client-projects.controller';
import type { TaonClientProjectsEntity } from './taon-client-projects.entity';
import type { TaonClientProjectAttachmentEntity } from './taon-client-project-attachment.entity';
import { TaonClientProjectAttachmentController } from './taon-client-project-attachment.controller';

@Injectable()
export class TaonClientProjectsApiService extends TaonBaseAngularService {
  private readonly controller = this.inject(TaonClientProjectsController);
  private readonly attachmentController = this.inject(TaonClientProjectAttachmentController);

  list$(archived = false): Observable<TaonClientProjectsEntity[]> {
    return this.controller.list(archived).request!().observable.pipe(
      map(response => response.body?.json || []),
    );
  }

  async list(archived = false): Promise<TaonClientProjectsEntity[]> {
    const response = await this.controller.list(archived).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to load projects.');
    return response.body?.json || [];
  }

  get$(id: number): Observable<TaonClientProjectsEntity> {
    return this.controller.get(id).request!().observable.pipe(
      map(response => response.body?.json),
    );
  }

  async get(id: number): Promise<TaonClientProjectsEntity> {
    const response = await this.controller.get(id).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to load project.');
    return response.body.json;
  }

  async create(input: {
    name: string;
    contactName?: string;
    description: string;
    budgetAmount?: number | null;
    budgetCurrency?: string;
  }): Promise<TaonClientProjectsEntity> {
    const response = await this.controller.create(input).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to create project.');
    return response.body.json;
  }

  async update(id: number, input: Record<string, unknown>): Promise<TaonClientProjectsEntity> {
    const response = await this.controller.update(id, input as any).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to update project.');
    return response.body.json;
  }

  async archive(id: number): Promise<TaonClientProjectsEntity> {
    const response = await this.controller.archive(id).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to archive project.');
    return response.body.json;
  }

  async restore(id: number): Promise<TaonClientProjectsEntity> {
    const response = await this.controller.restore(id).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to restore project.');
    return response.body.json;
  }

  comments$(projectId: number): Observable<TaonClientProjectCommentEntity[]> {
    return this.controller.comments(projectId).request!().observable.pipe(
      map(response => response.body?.json || []),
    );
  }

  async comments(projectId: number): Promise<TaonClientProjectCommentEntity[]> {
    const response = await this.controller.comments(projectId).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to load comments.');
    return response.body?.json || [];
  }

  async comment(projectId: number, body: string, status?: TaonClientProjectStatus): Promise<TaonClientProjectCommentEntity> {
    const response = await this.controller.comment({ projectId, body, status }).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to add comment.');
    return response.body.json;
  }

  async editComment(id: number, body: string): Promise<TaonClientProjectCommentEntity> {
    const response = await this.controller.editComment(id, { body }).request!();
    if (response.statusCode >= 400 || !response.body?.json) throw new Error(response.responseText || 'Unable to edit comment.');
    return response.body.json;
  }

  async deleteComment(id: number): Promise<void> {
    const response = await this.controller.deleteComment(id).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to delete comment.');
  }

  async attachments(projectId: number): Promise<TaonClientProjectAttachmentEntity[]> {
    const response = await this.attachmentController.listAttachments(projectId).request!();
    return response.body?.json || [];
  }

  attachments$(projectId: number): Observable<TaonClientProjectAttachmentEntity[]> {
    return this.attachmentController.listAttachments(projectId).request!().observable.pipe(
      map(response => response.body?.json || []),
    );
  }

  async uploadAttachment(projectId: number, file: File): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.attachmentController.uploadFormDataToServer(formData, { projectId }).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to upload attachment.');
    return response.body?.json || [];
  }

  async removeAttachment(key: string): Promise<void> {
    await this.attachmentController.removeAttachment(key).request!();
  }

  administrators$(): Observable<any[]> {
    return this.controller.administrators().request!().observable.pipe(map(response => response.body?.json || []));
  }

  assignments$(projectId: number): Observable<any[]> {
    return this.controller.assignments(projectId).request!().observable.pipe(
      map(response => response.body?.json || []),
    );
  }

  async assignAdministrators(projectId: number, administratorIds: number[]): Promise<any[]> {
    const response = await this.controller.assignAdministrators({ projectId, administratorIds }).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to update project assignments.');
    return response.body?.json || [];
  }

  activities$(projectId: number): Observable<any[]> {
    return this.controller.activities(projectId).request!().observable.pipe(map(response => response.body?.json || []));
  }

  statusHistory$(projectId: number): Observable<any[]> {
    return this.controller.statusHistory(projectId).request!().observable.pipe(map(response => response.body?.json || []));
  }

  activityFeed$(page = 1, pageSize = 20): Observable<any[]> {
    return this.controller.activityFeed(page, pageSize).request!().observable.pipe(map(response => response.body?.json || []));
  }

  async markAllRead(): Promise<void> {
    await this.controller.markAllRead().request!();
  }

  unreadCount$(): Observable<number> {
    return this.controller.unreadCount().request!().observable.pipe(map(response => Number(response.body?.json || 0)));
  }

  async markUnread(projectId: number): Promise<void> {
    await this.controller.markUnread(projectId).request!();
  }

  async markRead(projectId: number): Promise<void> {
    await this.controller.markRead(projectId).request!();
  }
}
