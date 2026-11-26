import { createContext, TaonBaseContext } from 'taon/src';

import { TaonClientProjectsEntity } from './taon-client-projects.entity';
import { TaonClientProjectCommentEntity } from './taon-client-project-comment.entity';
import { TaonClientProjectStatusHistoryEntity } from './taon-client-project-status-history.entity';
import { TaonClientProjectActivityEntity } from './taon-client-project-activity.entity';
import { TaonClientProjectAttachmentEntity } from './taon-client-project-attachment.entity';
import { TaonClientProjectsController } from './taon-client-projects.controller';
import { TaonClientProjectAdministratorEntity } from './taon-client-project-administrator.entity';
import { TaonClientProjectAttachmentController } from './taon-client-project-attachment.controller';

export const TaonClientProjectsAbstractContext = createContext(() => ({
  contextName: 'TaonClientProjectsAbstractContext',
  abstract: true,
  contexts: { TaonBaseContext },
  entities: {
    TaonClientProjectsEntity,
    TaonClientProjectCommentEntity,
    TaonClientProjectStatusHistoryEntity,
    TaonClientProjectActivityEntity,
    TaonClientProjectAttachmentEntity,
    TaonClientProjectAdministratorEntity,
  },
  controllers: { TaonClientProjectsController, TaonClientProjectAttachmentController },
}));
