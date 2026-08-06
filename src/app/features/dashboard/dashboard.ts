import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the authenticated area.
 *
 * Blank on purpose: it exists so a successful login has somewhere to land.
 * The real shell — server rail, channel sidebar, members panel — arrives with
 * the dashboard work in PLAN.md §2.
 */
@Component({
  selector: 'fz-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
