import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TaonClientProjectsApiService } from '../taon-client-projects-api.service';

@Component({
  selector: 'taon-client-project-activity',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './taon-client-project-activity.component.html',
  styleUrl: './taon-client-project-activity.component.scss',
  providers: [TaonClientProjectsApiService],
})
export class TaonClientProjectActivityComponent implements OnInit {
  private readonly api = inject(TaonClientProjectsApiService);
  readonly activities = signal<any[]>([]);
  readonly unread = signal(0);
  page = 1;

  ngOnInit() { this.refresh(); }

  refresh() {
    this.api.activityFeed$(this.page, 20).pipe(takeUntilDestroyed()).subscribe(items => this.activities.set(items));
    this.api.unreadCount$().pipe(takeUntilDestroyed()).subscribe(count => this.unread.set(count));
  }

  async markAllRead() {
    await this.api.markAllRead();
    this.refresh();
  }

  nextPage() { this.page++; this.refresh(); }
  previousPage() { if (this.page > 1) { this.page--; this.refresh(); } }
}
