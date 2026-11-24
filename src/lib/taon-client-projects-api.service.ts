import { Injectable } from '@angular/core';
import { TaonBaseAngularService } from 'taon/src';

import type { TaonClientProjectCommentEntity } from './taon-client-project-comment.entity';
import type { TaonClientProjectStatus } from './taon-client-project-status';
import { TaonClientProjectsController } from './taon-client-projects.controller';
import type { TaonClientProjectsEntity } from './taon-client-projects.entity';

@Injectable()
export class TaonClientProjectsApiService extends TaonBaseAngularService {
  private readonly controller = this.inject(TaonClientProjectsController);

  async list(archived = false): Promise<TaonClientProjectsEntity[]> {
    const response = await this.controller.list(archived).request!();
    if (response.statusCode >= 400) throw new Error(response.responseText || 'Unable to load projects.');
    return response.body?.json || [];
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

  async markRead(projectId: number): Promise<void> {
    await this.controller.markRead(projectId).request!();
  }
}
