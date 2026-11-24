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
  selector: 'taon-client-project-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './taon-client-project-edit.component.html',
  providers: [TaonClientProjectsApiService],
})
export class TaonClientProjectEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly api = inject(TaonClientProjectsApiService);

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contactName: [''],
    budgetAmount: [null as number | null],
    budgetCurrency: ['PLN'],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  private id = 0;

  async ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    const project = await this.api.get(this.id);
    this.form.patchValue(project as any);
  }

  async submit() {
    if (this.form.invalid) return;
    await this.api.update(this.id, this.form.getRawValue());
    await this.router.navigate(['/projects', this.id]);
  }
}
