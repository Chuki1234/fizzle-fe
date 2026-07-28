import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Shell for the signed-out surfaces: an atmospheric band with the Fizzle mark
 * top-left and a centered card holding whichever auth page is routed.
 */
@Component({
  selector: 'fz-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {}
