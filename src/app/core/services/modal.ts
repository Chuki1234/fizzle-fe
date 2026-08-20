import { Injectable, signal } from '@angular/core';

export type ModalType = 'CREATE_SERVER' | 'CREATE_CHANNEL' | null;

@Injectable({
    providedIn: 'root',
})
export class ModalService {
    public activeModal = signal<ModalType>(null);

    open(type: ModalType) {
        this.activeModal.set(type);
    }

    close() {
        this.activeModal.set(null);
    }
}