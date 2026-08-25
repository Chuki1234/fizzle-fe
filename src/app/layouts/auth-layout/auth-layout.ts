import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

/**
 * Shell for the signed-out surfaces: Discord atmospheric dark backdrop
 * with Fizzle brand mark and floating doodles.
 */
@Component({
  selector: 'fz-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {}

