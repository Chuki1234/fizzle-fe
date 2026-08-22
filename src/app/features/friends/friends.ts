import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
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
export class Friends implements OnInit {
    public friendService = inject(FriendService);

    ngOnInit() {
        this.friendService.loadFriendsFromBackend();
    }

    onSearch(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.friendService.searchUsers(value);
    }
}