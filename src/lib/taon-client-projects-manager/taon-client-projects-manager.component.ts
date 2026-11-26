import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, finalize, of, timer } from 'rxjs';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TaonClientProjectsApiService } from '../taon-client-projects-api.service';
import type { TaonClientProjectsEntity } from '../taon-client-projects.entity';

@Component({
  selector: 'taon-client-projects-manager',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterLink,
    FormsModule,
  ],
  styleUrl: './taon-client-projects-manager.component.scss',
  templateUrl: './taon-client-projects-manager.component.html',
  providers: [TaonClientProjectsApiService],
})
export class TaonClientProjectsManagerComponent implements OnInit {
  private readonly api = inject(TaonClientProjectsApiService);

  readonly projects = signal<TaonClientProjectsEntity[]>([]);

  readonly loading = signal(true);

  ngOnInit() {
    timer(0, 5000).pipe(
      exhaustMap(() => {
        this.loading.set(true);
        return this.api.list$(false).pipe(
          catchError(() => of([] as TaonClientProjectsEntity[])),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(projects => this.projects.set(projects));
  }
}
