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
  selector: 'taon-client-project-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './taon-client-project-create.component.html',
  providers: [TaonClientProjectsApiService],
})
export class TaonClientProjectCreateComponent {
  private readonly fb = inject(FormBuilder);

  private readonly api = inject(TaonClientProjectsApiService);

  private readonly router = inject(Router);

  sending = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    contactName: [''],
    budgetAmount: [null as number | null],
    budgetCurrency: ['PLN'],
    description: ['', [Validators.required, Validators.minLength(10)]],
  });

  async submit() {
    if (this.form.invalid) return;
    this.sending = true;
    try {
      const project = await this.api.create(this.form.getRawValue());
      await this.router.navigate(['/projects', project.id]);
    } finally {
      this.sending = false;
    }
  }
}
