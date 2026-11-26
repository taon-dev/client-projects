import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Routes } from '@angular/router';
import { RouterLink } from '@angular/router';

import { TaonClientProjectStatus } from './taon-client-project-status';
import { TaonClientProjectsApiService } from './taon-client-projects-api.service';
import type { TaonClientProjectsEntity } from './taon-client-projects.entity';
import { TaonProjectAssignmentDialogComponent } from './taon-project-assignment-dialog/taon-project-assignment-dialog.component';

@Component({
  selector: 'taon-projects-manager-backoffice',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './taon-projects-manager-backoffice.component.html',
})
export class TaonProjectsManagerBackofficeComponent implements OnInit {
  private readonly api = inject(TaonClientProjectsApiService);
  private readonly dialog = inject(MatDialog);

  readonly projects = signal<TaonClientProjectsEntity[]>([]);

  search = '';

  archived = false;

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    this.projects.set(await this.api.list(this.archived));
  }

  filtered(): TaonClientProjectsEntity[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.projects();
    return this.projects().filter(project =>
      project.name.toLowerCase().includes(query),
    );
  }

  async archive(project: TaonClientProjectsEntity) {
    await this.api.archive(project.id);
    await this.refresh();
  }

  openAssignments(project: TaonClientProjectsEntity) {
    this.dialog.open(TaonProjectAssignmentDialogComponent, {
      data: { projectId: project.id, projectName: project.name },
    });
  }

  async restore(project: TaonClientProjectsEntity) {
    await this.api.restore(project.id);
    await this.refresh();
  }
}
