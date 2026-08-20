import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FriendService } from '../../core/services/friend';

@Component({
    selector: 'fz-friends',
    standalone: true,
    imports: [CommonModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './friends.html',
    styleUrl: './friends.css',
})
export class Friends {
    public friendService = inject(FriendService);
}