import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TaonClientProjectsApiService } from '../taon-client-projects-api.service';

@Component({
  selector: 'taon-project-assignment-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './taon-project-assignment-dialog.component.html',
  styleUrl: './taon-project-assignment-dialog.component.scss',
  providers: [TaonClientProjectsApiService],
})
export class TaonProjectAssignmentDialogComponent implements OnInit {
  private readonly projects = inject(TaonClientProjectsApiService);
  readonly administrators = signal<any[]>([]);
  readonly selected = signal<number[]>([]);
  readonly loading = signal(true);
  search = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: { projectId: number; projectName: string },
    private readonly dialogRef: MatDialogRef<TaonProjectAssignmentDialogComponent>,
  ) {}

  ngOnInit() {
    this.projects.administrators$().pipe(takeUntilDestroyed()).subscribe(items => {
      this.administrators.set(items);
      this.loading.set(false);
    });
    this.projects.assignments$(this.data.projectId).pipe(takeUntilDestroyed()).subscribe(items => {
      this.selected.set(items.map((item: any) => item.administratorId));
    });
  }

  filtered() {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.administrators();
    return this.administrators().filter(user => `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''}`.toLowerCase().includes(query));
  }

  toggle(id: number) {
    this.selected.update(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  }

  async save() {
    await this.projects.assignAdministrators(this.data.projectId, this.selected());
    this.dialogRef.close(true);
  }

  cancel() { this.dialogRef.close(false); }
}
