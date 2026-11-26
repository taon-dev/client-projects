import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';
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
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { TaonClientProjectsApiService } from '../taon-client-projects-api.service';
import type { TaonClientProjectsEntity } from '../taon-client-projects.entity';
import { TaonClientProjectStatus } from '../taon-client-project-status';

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
    MatExpansionModule,
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
  readonly attachments = signal<any[]>([]);
  readonly statusHistory = signal<any[]>([]);

  commentDraft = '';

  statusChange: TaonClientProjectStatus | null = null;
  readonly statusOptions = Object.values(TaonClientProjectStatus);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.get$(id).pipe(
      switchMap(project => {
        this.project.set(project);
        void this.api.markRead(id);
        return forkJoin({
          comments: this.api.comments$(id),
          attachments: this.api.attachments$(id),
          statusHistory: this.api.statusHistory$(id),
        });
      }),
      takeUntilDestroyed(),
    ).subscribe({
      next: data => {
        this.comments.set(data.comments);
        this.attachments.set(data.attachments);
        this.statusHistory.set(data.statusHistory);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  async archive() {
    const project = this.project();
    if (!project) return;
    this.project.set(await this.api.archive(project.id));
  }

  async selectAttachments(event: Event) {
    const input = event.target as HTMLInputElement;
    const project = this.project();
    const files = Array.from(input.files || []);
    if (!project || !files.length) return;
    for (const file of files) {
      await this.api.uploadAttachment(project.id, file);
    }
    this.attachments.set(await this.api.attachments(project.id));
    input.value = '';
  }

  async removeAttachment(attachment: any) {
    await this.api.removeAttachment(attachment.storageKey);
    const project = this.project();
    if (project) this.attachments.set(await this.api.attachments(project.id));
  }

  async markUnread() {
    const project = this.project();
    if (project) await this.api.markUnread(project.id);
  }

  async sendComment() {
    const project = this.project();
    if (!project || !this.commentDraft.trim()) return;
    await this.api.comment(project.id, this.commentDraft.trim(), this.statusChange || undefined);
    this.commentDraft = '';
    this.comments.set(await this.api.comments(project.id));
  }
}
