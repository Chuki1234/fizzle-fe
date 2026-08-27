import { Injectable, signal } from '@angular/core';

export type ModalType =
  | 'CREATE_SERVER'
  | 'CREATE_CHANNEL'
  | 'INVITE_FRIENDS'
  | 'SERVER_SETTINGS'
  | string
  | null;

@Injectable({
    providedIn: 'root',
})
export class ModalService {
    public activeModal = signal<ModalType>(null);
    public modalData = signal<any>(null);

    open(type: ModalType | string, data?: any) {
        this.activeModal.set(type as ModalType);
        this.modalData.set(data || null);
    }

    close() {
        this.activeModal.set(null);
        this.modalData.set(null);
    }
}