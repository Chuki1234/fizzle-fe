import { Injectable, signal } from '@angular/core';

export interface InAppNotification {
  id: string;
  type: 'server_invite' | 'friend_request' | 'message' | 'info';
  title: string;
  message: string;
  avatar?: string | null;
  actionLabel?: string;
  actionRoute?: string[];
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  notifications = signal<InAppNotification[]>([]);

  show(notification: Omit<InAppNotification, 'id'>) {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 7);
    const item: InAppNotification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    this.notifications.update(list => [...list, item]);

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, item.duration);
    }
  }

  dismiss(id: string) {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
