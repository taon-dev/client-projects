import { Routes } from '@angular/router';
import { adminLazyRoute } from '@taon-dev/ui/src';

import { TaonProjectsManagerBackofficeComponent } from './taon-projects-manager-backoffice.component';

export const TaonClientProjectsBackofficeRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'messages',
  },
  // {
  //   path: 'projects',
  //   loadComponent: () =>
  //     import('./taon-client-projects-manager/taon-client-projects-manager.component').then(
  //       m => m.TaonClientProjectsManagerComponent,
  //     ),
  // },
  // adminLazyRoute({
  //   path: 'projects',
  //   menuItem: 'Projects',
  //   icon: 'projects',
  //   expandable: false,
  //   loader: () =>
  //     import('@taon-dev/messenger/src').then(
  //       m => m.TaonMessengerBackofficeRoutes,
  //     ),
  // }),
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
