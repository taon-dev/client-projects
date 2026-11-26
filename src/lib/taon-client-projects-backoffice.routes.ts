import { Routes } from '@angular/router';
import { adminLazyRoute } from '@taon-dev/ui/src';

import { TaonProjectsManagerBackofficeComponent } from './taon-projects-manager-backoffice.component';

export const TaonClientProjectsBackofficeRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'projects',
  },
  {
    path: 'projects',
    loadComponent: () => Promise.resolve(TaonProjectsManagerBackofficeComponent),
  },
  adminLazyRoute({
    path: 'messages',
    menuItem: 'Messages',
    icon: 'messages',
    expandable: false,
    loader: () =>
      import('@taon-dev/messenger/src').then(
        m => m.TaonMessengerBackofficeRoutes,
      ),
  }),
];
