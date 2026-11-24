import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
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
export class TaonClientProjectsManagerComponent implements OnInit, OnDestroy {
  private readonly api = inject(TaonClientProjectsApiService);

  readonly projects = signal<TaonClientProjectsEntity[]>([]);

  readonly loading = signal(true);

  private timer?: ReturnType<typeof setInterval>;

  async ngOnInit() {
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), 5000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh() {
    this.loading.set(true);
    try {
      const projects = await this.api.list(false);
      // await Utils.wait(2)
      this.projects.set(projects);
    } finally {
      this.loading.set(false);
    }
  }
}
