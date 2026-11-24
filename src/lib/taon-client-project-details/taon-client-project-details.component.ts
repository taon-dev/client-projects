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
  selector: 'taon-client-project-details',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatProgressSpinnerModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './taon-client-project-details.component.html',
  providers: [TaonClientProjectsApiService],
})
export class TaonClientProjectDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly api = inject(TaonClientProjectsApiService);

  readonly project = signal<TaonClientProjectsEntity | null>(null);

  readonly loading = signal(true);

  readonly comments = signal<any[]>([]);

  commentDraft = '';

  statusChange: any = null;

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.project.set(await this.api.get(id));
    await this.api.markRead(id);
    this.comments.set(await this.api.comments(id));
    this.loading.set(false);
  }

  async archive() {
    const project = this.project();
    if (!project) return;
    this.project.set(await this.api.archive(project.id));
  }

  async sendComment() {
    const project = this.project();
    if (!project || !this.commentDraft.trim()) return;
    await this.api.comment(project.id, this.commentDraft.trim());
    this.commentDraft = '';
    this.comments.set(await this.api.comments(project.id));
  }
}
