import {
  TaonAuthContextRepository,
  TaonSessionProvider,
  TaonSessionRepository,
} from '@taon-dev/session/src';
import {
  ClassHelpers,
  ExpressRequest,
  ExpressResponse,
  HttpStatusEnum,
  Models,
  Taon,
  TaonBaseStorageController,
  TaonController,
  TaonStorageObject,
  TaonUploadedFile,
  DELETE,
  GET,
  Query,
  getStatusCode,
} from 'taon/src';
import { UtilsJwt } from 'tnp-core/src';

import { TaonClientProjectAttachmentEntity } from './taon-client-project-attachment.entity';
import { TaonClientProjectsEntity } from './taon-client-projects.entity';
import { TaonClientProjectAdministratorEntity } from './taon-client-project-administrator.entity';

interface AttachmentQuery {
  projectId?: number;
}

@TaonController<TaonClientProjectAttachmentController>({
  className: 'TaonClientProjectAttachmentController',
  allowedMethods: ['uploadFormDataToServer', 'download', 'delete', 'exists', 'removeAttachment', 'listAttachments'],
})
export class TaonClientProjectAttachmentController extends TaonBaseStorageController<AttachmentQuery> {
  private readonly session = this.inject(TaonSessionRepository);
  private readonly auth = this.inject(TaonAuthContextRepository);
  private readonly sessionProvider = this.inject(TaonSessionProvider);

  private repo<T>(entity: new () => T) {
    return this.ctx.connection.manager.getRepository(entity as any);
  }

  private async current(req: any) {
    await this.session.throwIfNotAuthenticated({ req });
    const context = await this.auth.getContext(req.userId, req.sessionId);
    return {
      id: Number(req.userId),
      isSuperUser: !!context?.isSuperUser,
      isAdmin: !!context?.isSuperUser || !!context?.hasAccess?.toManageCms || !!context?.hasAccess?.toManageUsers,
    };
  }

  private async requireProject(projectId: number, req: any) {
    const current = await this.current(req);
    const project = await this.repo(TaonClientProjectsEntity).findOne({ where: { id: projectId } });
    if (!project) Taon.error({ status: getStatusCode(HttpStatusEnum.NOT_FOUND), message: 'Project not found.' });
    if (!current.isAdmin && project.clientId !== current.id) {
      Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Project access denied.' });
    }
    if (current.isAdmin && !current.isSuperUser && project.clientId !== current.id) {
      const assignments = await this.repo(TaonClientProjectAdministratorEntity).find({ where: { projectId } });
      if (assignments.length > 0 && !assignments.some((a: any) => a.administratorId === current.id)) {
        Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Project access denied.' });
      }
    }
    return { project, current };
  }

  protected async beforeEachRequest({ req, methodConfig }: Models.TaonCtrlBeforeEachRequestParams<TaonClientProjectAttachmentController>): Promise<void> {
    const projectId = Number(req.query?.projectId);
    if (projectId > 0) {
      await this.requireProject(projectId, req);
      return;
    }
    const key = typeof req.query?.key === 'string' ? req.query.key : '';
    if (key) {
      const attachment = await this.repo(TaonClientProjectAttachmentEntity).findOne({ where: { storageKey: key, deletedAt: null } });
      if (!attachment) Taon.error({ status: getStatusCode(HttpStatusEnum.NOT_FOUND), message: 'Attachment not found.' });
      await this.requireProject(attachment.projectId, req);
    }
  }

  protected async handleUploadFiles(files: TaonUploadedFile[], queryParams?: AttachmentQuery, req?: ExpressRequest, res?: ExpressResponse): Promise<TaonStorageObject[]> {
    if (!req) Taon.error({ status: getStatusCode(HttpStatusEnum.BAD_REQUEST), message: 'Upload request context is required.' });
    if (files.length !== 1) Taon.error({ status: getStatusCode(HttpStatusEnum.BAD_REQUEST), message: 'Upload exactly one file.' });
    const projectId = Number(queryParams?.projectId);
    const { project, current } = await this.requireProject(projectId, req);
    if (project.acceptedAt && !current.isAdmin) Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Original project attachments are read-only after acceptance.' });

    const file = files[0];
    file.originalFileName = file.fileName;
    file.fileName = `${crypto.randomUUID()}__${file.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const objects = await super.handleUploadFiles(files, queryParams, req, res);
    const attachmentRepo = this.repo(TaonClientProjectAttachmentEntity);
    for (const object of objects) {
      await attachmentRepo.save(attachmentRepo.create({
        projectId,
        uploadedBy: current.id,
        storageKey: object.key,
        fileName: file.originalFileName || file.fileName,
        mimeType: (file as any).mimeType || (file as any).type || null,
        sizeBytes: Number((object as any).size) || Number((file as any).size) || null,
        deletedAt: null,
      }));
    }
    return Promise.all(objects.map(async object => ({
      ...object,
      downloadUrl: this.buildStorageDownloadUrl({ req, key: object.key, private: true, download: true }),
    })));
  }

  @GET()
  listAttachments(@Query('projectId') projectId: number): Taon.Response<TaonClientProjectAttachmentEntity[]> {
    return async req => {
      await this.requireProject(Number(projectId), req);
      return this.repo(TaonClientProjectAttachmentEntity).find({
        where: { projectId: Number(projectId), deletedAt: null },
        order: { createdAt: 'ASC' },
      }) as any;
    };
  }

  @DELETE()
  removeAttachment(@Query('key') key: string): Taon.Response<boolean> {
    return async req => {
      const attachment = await this.repo(TaonClientProjectAttachmentEntity).findOne({ where: { storageKey: key, deletedAt: null } });
      if (!attachment) Taon.error({ status: getStatusCode(HttpStatusEnum.NOT_FOUND), message: 'Attachment not found.' });
      const { project, current } = await this.requireProject(attachment.projectId, req);
      if (project.acceptedAt && !current.isAdmin) Taon.error({ status: getStatusCode(HttpStatusEnum.FORBIDDEN), message: 'Original project attachments are read-only after acceptance.' });
      attachment.deletedAt = new Date();
      await this.repo(TaonClientProjectAttachmentEntity).save(attachment);
      if (await this.storageObjectExists(key)) await Taon.getResponseValue(this.delete(key));
      return true;
    };
  }

  afterFileUploadHook(): void {}

  async isPublicStorageKey(): Promise<boolean> {
    return false;
  }

  buildStorageDownloadUrl(options: { req: ExpressRequest; key: string; private: boolean; token?: string; download?: boolean }): string {
    const url = new URL(this.getThisControllerMethodFullUrl('download'));
    url.search = '';
    url.searchParams.set('key', options.key);
    if (options.download) url.searchParams.set('download', 'true');
    if (options.token) url.searchParams.set('token', options.token);
    return `${this.ctx.frontendHostUri.origin}${url.pathname}${url.search}`;
  }

  async createStorageDownloadToken(options: { key: string; expiresAt: number }): Promise<string> {
    const expiresInSeconds = Math.floor((options.expiresAt - Date.now()) / 1000);
    return UtilsJwt.sign({ storageController: ClassHelpers.getName(this), key: options.key, expiresAt: options.expiresAt }, this.sessionProvider.cookies.ACCESS_TOKEN_SECRET, { expiresIn: expiresInSeconds });
  }
}
