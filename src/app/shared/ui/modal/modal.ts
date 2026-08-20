import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../core/services/modal';
import { ServerService } from '../../../core/services/server';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './modal.html',// Đảm bảo file modal.html nằm cùng thư mục với modal.ts
    styleUrl: './modal.css'
})
export class ModalComponent {
    public modalService = inject(ModalService);
    public serverService = inject(ServerService);

    // Form State
    public serverName = signal('');
    public serverIcon = signal('🔥');

    public channelName = signal('');
    public channelType = signal<'text' | 'voice'>('text');

    onCreateServer() {
        if (!this.serverName().trim()) return;
        this.serverService.addServer(this.serverName(), this.serverIcon());
        this.serverName.set('');
        this.modalService.close();
    }

    onCreateChannel() {
        if (!this.channelName().trim()) return;

        // Sửa lỗi 3 arguments thành 2 arguments: name và type
        this.serverService.addChannel(this.channelName(), this.channelType());
        this.channelName.set('');
        this.modalService.close();
    }
}