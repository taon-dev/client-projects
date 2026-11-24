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
} from '@taon-dev/session/src';

import { TaonClientProjectStatus } from './taon-client-project-status';
import { TaonClientProjectsEntity } from './taon-client-projects.entity';
import { TaonClientProjectCommentEntity } from './taon-client-project-comment.entity';
import { TaonClientProjectStatusHistoryEntity } from './taon-client-project-status-history.entity';
import { TaonClientProjectActivityEntity } from './taon-client-project-activity.entity';

interface ProjectInput {
  name?: string;
  contactName?: string | null;
  description?: string;
  budgetAmount?: number | null;
  budgetCurrency?: string;
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
    return {
      id: Number(req.userId),
      isAdmin:
        !!context?.isSuperUser ||
        !!context?.hasAccess?.toManageCms ||
        !!context?.hasAccess?.toManageUsers,
    };
  }

  private async requireProject(
    projectId: number,
    userId: number,
    isAdmin: boolean,
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
      return repo.find({
        where: current.isAdmin
          ? isArchived
            ? { archivedAt: {} as any }
            : { archivedAt: null }
          : isArchived
            ? ({ clientId: current.id, archivedAt: {} as any } as any)
            : ({ clientId: current.id, archivedAt: null } as any),
        order: { updatedAt: 'DESC' },
      }) as any;
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
      const project = await this.requireProject(Number(id), current.id, true);
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
      await this.requireProject(Number(projectId), current.id, current.isAdmin);
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

  @POST()
  markRead(@Query('projectId') projectId: number): Taon.Response<boolean> {
    //#region @websqlFunc
    return async req => {
      const current = await this.user(req);
      await this.requireProject(Number(projectId), current.id, current.isAdmin);
      await this.repository(TaonClientProjectActivityEntity).update(
        { projectId: Number(projectId), userId: current.id, isRead: false },
        { isRead: true },
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
      }),
    );
  }
}
