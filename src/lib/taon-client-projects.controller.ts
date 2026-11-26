import {
  Body,
  DELETE,
  GET,
  HttpStatusEnum,
  Models,
  POST,
  PUT,
  Query,
  Taon,
  TaonBaseCrudController,
  TaonController,
  getStatusCode,
} from 'taon/src';
import {
  TaonAuthContextRepository,
  TaonSessionRepository,
  TaonSessionUserEntity,
  TaonSessionUserIdentityEntity,
} from '@taon-dev/session/src';

import { TaonClientProjectStatus } from './taon-client-project-status';
import { TaonClientProjectsEntity } from './taon-client-projects.entity';
import { TaonClientProjectCommentEntity } from './taon-client-project-comment.entity';
import { TaonClientProjectStatusHistoryEntity } from './taon-client-project-status-history.entity';
import { TaonClientProjectActivityEntity } from './taon-client-project-activity.entity';
import { TaonClientProjectAdministratorEntity } from './taon-client-project-administrator.entity';

interface ProjectInput {
  name?: string;
  contactName?: string | null;
  description?: string;
  budgetAmount?: number | null;
  budgetCurrency?: string;
}

interface AssignmentInput {
  projectId: number;
  administratorIds: number[];
}

interface CommentInput {
  projectId: number;
  body: string;
  status?: TaonClientProjectStatus | null;
  clientRequestId?: string;
}

@TaonController<TaonClientProjectsController>({
  className: 'TaonClientProjectsController',
  allowedMethods: [
    'list',
    'get',
    'create',
    'update',
    'archive',
    'restore',
    'comments',
    'comment',
    'editComment',
    'deleteComment',
    'markRead',
    'assignments',
    'administrators',
    'assignAdministrators',
    'activities',
    'statusHistory',
    'unreadCount',
    'markUnread',
    'activityFeed',
    'markAllRead',
  ],
})
export class TaonClientProjectsController extends TaonBaseCrudController<TaonClientProjectsEntity> {
  entityClassResolveFn = () => TaonClientProjectsEntity;

  private readonly session = this.inject(TaonSessionRepository);
  private readonly auth = this.inject(TaonAuthContextRepository);

  private repository<T>(entity: new () => T) {
    return this.ctx.connection.manager.getRepository(entity as any);
  }

  private async user(
    req: Models.TaonCtrlBeforeEachRequestParams<TaonClientProjectsController>['req'],
  ) {
    await this.session.throwIfNotAuthenticated({ req });
    const context = await this.auth.getContext(req.userId, req.sessionId);
    const isSuperUser = !!context?.isSuperUser;
    return {
      id: Number(req.userId),
      isSuperUser,
      isAdmin:
        isSuperUser ||
        !!context?.hasAccess?.toManageCms ||
        !!context?.hasAccess?.toManageUsers,
    };
  }

  private async requireProject(
    projectId: number,
    userId: number,
    isAdmin: boolean,
    isSuperUser = false,
  ) {
    const project = await this.repository(TaonClientProjectsEntity).findOne({
      where: { id: projectId },
    });
    if (!project) {
      Taon.error({
        status: getStatusCode(HttpStatusEnum.NOT_FOUND),
        message: 'Project not found.',
      });
    }
    if (!isAdmin && project.clientId !== userId) {
      Taon.error({
        status: getStatusCode(HttpStatusEnum.FORBIDDEN),
        message: 'Project access denied.',
      });
    }
    if (isAdmin && !isSuperUser && project.clientId !== userId) {
      const assignments = await this.repository(TaonClientProjectAdministratorEntity).find({
        where: { projectId },
      });
      if (assignments.length > 0 && !assignments.some(a => a.administratorId === userId)) {
        Taon.error({
          status: getStatusCode(HttpStatusEnum.FORBIDDEN),
          message: 'Project access denied.',
        });
      }
    }
    return project;
  }

  @GET()
  list(
    @Query('archived') archived?: boolean,
  ): Taon.Response<TaonClientProjectsEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const isArchived = String(archived) === 'true';
      const repo = this.repository(TaonClientProjectsEntity);
      const projects = await repo.find({
        where: current.isAdmin
          ? isArchived
            ? { archivedAt: {} as any }
            : { archivedAt: null }
          : isArchived
            ? ({ clientId: current.id, archivedAt: {} as any } as any)
            : ({ clientId: current.id, archivedAt: null } as any),
        order: { updatedAt: 'DESC' },
      });
      if (!current.isAdmin || current.isSuperUser) return projects as any;

      const assignmentRepo = this.repository(TaonClientProjectAdministratorEntity);
      const result: any[] = [];
      for (const project of projects) {
        const assignments = await assignmentRepo.find({ where: { projectId: project.id } });
        if (assignments.length === 0 || assignments.some(a => a.administratorId === current.id)) {
          result.push(project);
          continue;
        }
        result.push({
          id: project.id,
          name: project.name,
          restricted: true,
        });
      }
      return result as any;
    };
    //#endregion
  }

  @GET()
  get(@Query('id') id: number): Taon.Response<TaonClientProjectsEntity | null> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      return this.requireProject(
        Number(id),
        current.id,
        current.isAdmin,
        current.isSuperUser,
      ) as any;
    };
    //#endregion
  }

  @POST()
  create(@Body() input: ProjectInput): Taon.Response<TaonClientProjectsEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const name = input?.name?.trim();
      const description = input?.description?.trim();
      if (!name || !description || description.length < 10) {
        Taon.error({
          status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
          message: 'Project name and description are required.',
        });
      }
      if (input?.budgetAmount != null && Number(input.budgetAmount) < 0) {
        Taon.error({
          status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
          message: 'Budget cannot be negative.',
        });
      }
      const project = await this.repository(TaonClientProjectsEntity).save(
        this.repository(TaonClientProjectsEntity).create({
          clientId: current.id,
          name,
          contactName: input?.contactName?.trim() || null,
          description,
          budgetAmount:
            input?.budgetAmount == null ? null : Number(input.budgetAmount),
          budgetCurrency: input?.budgetCurrency?.trim() || 'PLN',
          status: TaonClientProjectStatus.New,
          archivedAt: null,
          acceptedAt: null,
        }),
      );
      await this.createActivity(project.id, current.id, 'created');
      return project as any;
    };
    //#endregion
  }

  @PUT()
  update(
    @Query('id') id: number,
    @Body() input: ProjectInput,
  ): Taon.Response<TaonClientProjectsEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const project = await this.requireProject(
        Number(id),
        current.id,
        current.isAdmin,
        current.isSuperUser,
      );
      if (!current.isAdmin && project.acceptedAt) {
        Taon.error({
          status: getStatusCode(HttpStatusEnum.FORBIDDEN),
          message: 'Project information is read-only after acceptance.',
        });
      }
      if (input?.name !== undefined) {
        if (!input.name.trim())
          Taon.error({
            status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
            message: 'Project name is required.',
          });
        project.name = input.name.trim();
      }
      if (input?.description !== undefined) {
        if (input.description.trim().length < 10)
          Taon.error({
            status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
            message: 'Description must contain at least 10 characters.',
          });
        project.description = input.description.trim();
      }
      if (input?.contactName !== undefined)
        project.contactName = input.contactName?.trim() || null;
      if (input?.budgetAmount !== undefined) {
        if (input.budgetAmount != null && Number(input.budgetAmount) < 0)
          Taon.error({
            status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
            message: 'Budget cannot be negative.',
          });
        project.budgetAmount =
          input.budgetAmount == null ? null : Number(input.budgetAmount);
      }
      if (input?.budgetCurrency !== undefined)
        project.budgetCurrency = input.budgetCurrency.trim() || 'PLN';

      return this.repository(TaonClientProjectsEntity).save(project) as any;
    };
    //#endregion
  }

  @POST()
  archive(@Query('id') id: number): Taon.Response<TaonClientProjectsEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const project = await this.requireProject(
        Number(id),
        current.id,
        current.isAdmin,
        current.isSuperUser,
      );
      project.archivedAt = new Date();
      project.archivedBy = current.id;
      const saved = await this.repository(TaonClientProjectsEntity).save(
        project,
      );
      await this.createActivity(project.id, project.clientId, 'archived');
      return saved as any;
    };
    //#endregion
  }

  @POST()
  restore(@Query('id') id: number): Taon.Response<TaonClientProjectsEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      if (!current.isAdmin)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.FORBIDDEN),
          message: 'Only administrators can restore projects.',
        });
      const project = await this.requireProject(Number(id), current.id, true, current.isSuperUser);
      project.archivedAt = null;
      project.archivedBy = null;
      const saved = await this.repository(TaonClientProjectsEntity).save(
        project,
      );
      await this.createActivity(project.id, project.clientId, 'restored');
      return saved as any;
    };
    //#endregion
  }

  @GET()
  comments(
    @Query('projectId') projectId: number,
  ): Taon.Response<TaonClientProjectCommentEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      return this.repository(TaonClientProjectCommentEntity).find({
        where: { projectId: Number(projectId), deletedAt: null },
        order: { createdAt: 'ASC' },
      }) as any;
    };
    //#endregion
  }

  @POST()
  comment(
    @Body() input: CommentInput,
  ): Taon.Response<TaonClientProjectCommentEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const project = await this.requireProject(
        Number(input.projectId),
        current.id,
        current.isAdmin,
      );
      const body = input.body?.trim();
      if (!body)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
          message: 'Comment text is required.',
        });

      if (input.status) {
        if (!current.isAdmin)
          Taon.error({
            status: getStatusCode(HttpStatusEnum.FORBIDDEN),
            message: 'Only administrators can change project status.',
          });
        if (!Object.values(TaonClientProjectStatus).includes(input.status))
          Taon.error({
            status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
            message: 'Invalid project status.',
          });
        const previousStatus = project.status;
        project.status = input.status;
        if (input.status === TaonClientProjectStatus.Accepted)
          project.acceptedAt = new Date();
        await this.repository(TaonClientProjectsEntity).save(project);

        const comment = await this.repository(
          TaonClientProjectCommentEntity,
        ).save(
          this.repository(TaonClientProjectCommentEntity).create({
            projectId: project.id,
            authorId: current.id,
            authorType: 'administrator',
            body,
            statusChange: true,
            deletedAt: null,
          }),
        );
        await this.repository(TaonClientProjectStatusHistoryEntity).save(
          this.repository(TaonClientProjectStatusHistoryEntity).create({
            projectId: project.id,
            previousStatus,
            newStatus: input.status,
            administratorId: current.id,
            commentId: comment.id,
          }),
        );
        await this.createActivity(
          project.id,
          project.clientId,
          'status-change',
        );
        return comment;
      }

      const comment = await this.repository(
        TaonClientProjectCommentEntity,
      ).save(
        this.repository(TaonClientProjectCommentEntity).create({
          projectId: project.id,
          authorId: current.id,
          authorType: current.isAdmin ? 'administrator' : 'client',
          body,
          statusChange: false,
          deletedAt: null,
        }),
      );
      await this.createActivity(
        project.id,
        current.isAdmin ? project.clientId : project.clientId,
        'comment',
      );
      return comment as any;
    };
    //#endregion
  }

  @PUT()
  editComment(
    @Query('id') id: number,
    @Body() input: { body?: string },
  ): Taon.Response<TaonClientProjectCommentEntity> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const comment = await this.repository(
        TaonClientProjectCommentEntity,
      ).findOne({ where: { id: Number(id) } });
      if (!comment || comment.deletedAt || comment.statusChange)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.NOT_FOUND),
          message: 'Comment not found.',
        });
      if (comment.authorId !== current.id)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.FORBIDDEN),
          message: 'You can only edit your own comments.',
        });
      const body = input.body?.trim();
      if (!body)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.BAD_REQUEST),
          message: 'Comment text is required.',
        });
      comment.body = body;
      return this.repository(TaonClientProjectCommentEntity).save(
        comment,
      ) as any;
    };
    //#endregion
  }

  @DELETE()
  deleteComment(@Query('id') id: number): Taon.Response<boolean> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const comment = await this.repository(
        TaonClientProjectCommentEntity,
      ).findOne({ where: { id: Number(id) } });
      if (!comment || comment.deletedAt || comment.statusChange)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.NOT_FOUND),
          message: 'Comment not found.',
        });
      if (comment.authorId !== current.id)
        Taon.error({
          status: getStatusCode(HttpStatusEnum.FORBIDDEN),
          message: 'You can only delete your own comments.',
        });
      comment.deletedAt = new Date();
      await this.repository(TaonClientProjectCommentEntity).save(comment);
      return true;
    };
    //#endregion
  }

  @GET()
  administrators(): Taon.Response<any[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      if (!current.isSuperUser)
        Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Only superusers can list administrators.' });
      const users = await this.repository(TaonSessionUserEntity).find({ relations: { identities: true } });
      const result: any[] = [];
      for (const user of users) {
        const context = await this.auth.getContext(user.id, req.sessionId);
        if (!context?.isSuperUser && !context?.hasAccess?.toManageCms && !context?.hasAccess?.toManageUsers) continue;
        const identity = (user.identities || []).find((item: any) => item.email);
        result.push({
          id: user.id,
          firstName: (user as any).firstName || null,
          lastName: (user as any).lastName || null,
          email: identity?.email || null,
        });
      }
      return result as any;
    };
    //#endregion
  }

  @GET()
  assignments(@Query('projectId') projectId: number): Taon.Response<TaonClientProjectAdministratorEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      if (!current.isSuperUser)
        Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Only superusers can view project assignments.' });
      return this.repository(TaonClientProjectAdministratorEntity).find({
        where: { projectId: Number(projectId) },
        order: { createdAt: 'ASC' },
      }) as any;
    };
    //#endregion
  }

  @POST()
  assignAdministrators(@Body() input: AssignmentInput): Taon.Response<TaonClientProjectAdministratorEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      if (!current.isSuperUser)
        Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Only superusers can assign project administrators.' });
      await this.requireProject(Number(input.projectId), current.id, true, true);
      const repo = this.repository(TaonClientProjectAdministratorEntity);
      await repo.delete({ projectId: Number(input.projectId) } as any);
      const ids = Array.from(new Set((input.administratorIds || []).map(Number).filter(Boolean)));
      const assignments = await Promise.all(ids.map(administratorId => repo.save(repo.create({
        projectId: Number(input.projectId),
        administratorId,
        assignedBy: current.id,
      }))));
      await this.createActivity(Number(input.projectId), current.id, 'assignment');
      return assignments as any;
    };
    //#endregion
  }

  @GET()
  activities(@Query('projectId') projectId: number): Taon.Response<TaonClientProjectActivityEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      return this.repository(TaonClientProjectActivityEntity).find({
        where: { projectId: Number(projectId), userId: current.id },
        order: { createdAt: 'DESC' },
      }) as any;
    };
    //#endregion
  }

  @GET()
  statusHistory(@Query('projectId') projectId: number): Taon.Response<TaonClientProjectStatusHistoryEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      return this.repository(TaonClientProjectStatusHistoryEntity).find({
        where: { projectId: Number(projectId) },
        order: { createdAt: 'ASC' },
      }) as any;
    };
    //#endregion
  }

  @GET()
  activityFeed(@Query('page') page?: number, @Query('pageSize') pageSize?: number): Taon.Response<TaonClientProjectActivityEntity[]> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
      const offset = (Math.max(Number(page) || 1, 1) - 1) * size;
      const activities = await this.repository(TaonClientProjectActivityEntity).find({
        where: { userId: current.id },
        order: { createdAt: 'DESC' },
        skip: offset,
        take: size,
      });
      const authorized: TaonClientProjectActivityEntity[] = [];
      for (const activity of activities) {
        const project = await this.repository(TaonClientProjectsEntity).findOne({ where: { id: activity.projectId } });
        if (!project) continue;
        if (!current.isAdmin && project.clientId !== current.id) continue;
        if (current.isAdmin && !current.isSuperUser && project.clientId !== current.id) {
          const assignments = await this.repository(TaonClientProjectAdministratorEntity).find({ where: { projectId: project.id } });
          if (assignments.length > 0 && !assignments.some(a => a.administratorId === current.id)) continue;
        }
        authorized.push(activity as any);
      }
      return authorized as any;
    };
    //#endregion
  }

  @POST()
  markAllRead(): Taon.Response<boolean> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.repository(TaonClientProjectActivityEntity).update(
        { userId: current.id },
        { isRead: true, manualUnread: false },
      );
      return true;
    };
    //#endregion
  }

  @GET()
  unreadCount(): Taon.Response<number> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      const activityRepo = this.repository(TaonClientProjectActivityEntity);
      const activities = await activityRepo.find({ where: { userId: current.id } });
      let count = 0;
      for (const activity of activities) {
        if (activity.manualUnread) {
          count++;
          continue;
        }
        if (!activity.isRead) {
          const project = await this.repository(TaonClientProjectsEntity).findOne({ where: { id: activity.projectId } });
          if (!project) continue;
          if (!current.isAdmin || current.isSuperUser || project.clientId === current.id) {
            count++;
          } else {
            const assignments = await this.repository(TaonClientProjectAdministratorEntity).find({ where: { projectId: project.id } });
            if (assignments.length === 0 || assignments.some(a => a.administratorId === current.id)) count++;
          }
        }
      }
      return count as any;
    };
    //#endregion
  }

  @POST()
  markUnread(@Query('projectId') projectId: number): Taon.Response<boolean> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      const repo = this.repository(TaonClientProjectActivityEntity);
      let activity = await repo.findOne({ where: { projectId: Number(projectId), userId: current.id } });
      if (!activity) {
        activity = repo.create({ projectId: Number(projectId), userId: current.id, activityType: 'comment', isRead: false, manualUnread: true });
      } else {
        activity.manualUnread = true;
        activity.isRead = false;
      }
      await repo.save(activity);
      return true;
    };
    //#endregion
  }

  @POST()
  markRead(@Query('projectId') projectId: number): Taon.Response<boolean> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin, current.isSuperUser);
      await this.repository(TaonClientProjectActivityEntity).update(
        { projectId: Number(projectId), userId: current.id },
        { isRead: true, manualUnread: false },
      );
      return true;
    };
    //#endregion
  }

  private async createActivity(
    projectId: number,
    userId: number,
    activityType: TaonClientProjectActivityEntity['activityType'],
  ) {
    await this.repository(TaonClientProjectActivityEntity).save(
      this.repository(TaonClientProjectActivityEntity).create({
        projectId,
        userId,
        activityType,
        isRead: false,
        manualUnread: false,
      }),
    );
  }
}
