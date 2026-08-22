import { Injectable, signal } from '@angular/core';

export type ModalType = 'CREATE_SERVER' | 'CREATE_CHANNEL' | 'INVITE_FRIENDS' | null;

@Injectable({
    providedIn: 'root',
})
export class ModalService {
    public activeModal = signal<ModalType>(null);
    public modalData = signal<any>(null);

    open(type: ModalType, data?: any) {
        this.activeModal.set(type);
        this.modalData.set(data || null);
    }

    close() {
        this.activeModal.set(null);
        this.modalData.set(null);
    }
}