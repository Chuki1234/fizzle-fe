import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PendingAttachment {
    file: File;
    previewUrl: string;
    type: 'image' | 'video' | 'audio' | 'file';
    name: string;
    size: number;
}

@Component({
    selector: 'fz-attachment-preview',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (attachments.length > 0) {
            <div class="flex items-center gap-3 p-3 bg-[#131418] border-b border-[#22242b] overflow-x-auto scrollbar-thin">
                @for (item of attachments; track $index) {
                    <div class="relative group shrink-0 flex items-center gap-2.5 p-2 bg-[#1b1d24] border border-[#2a2c38] rounded-xl max-w-[220px]">
                        <!-- Thumbnail / Icon -->
                        @if (item.type === 'image') {
                            <img [src]="item.previewUrl" class="w-10 h-10 rounded-lg object-cover border border-zinc-700/50 shrink-0" alt="Preview" />
                        } @else if (item.type === 'video') {
                            <div class="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                                🎬
                            </div>
                        } @else if (item.type === 'audio') {
                            <div class="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                                🎵
                            </div>
                        } @else {
                            <div class="w-10 h-10 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-700">
                                📄
                            </div>
                        }

                        <!-- Info -->
                        <div class="flex flex-col min-w-0 pr-4">
                            <span class="text-xs font-medium text-zinc-200 truncate" [title]="item.name">{{ item.name }}</span>
                            <span class="text-[10px] text-zinc-500">{{ formatSize(item.size) }}</span>
                        </div>

                        <!-- Remove button -->
                        <button type="button"
                                (click)="remove.emit($index)"
                                class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-xs shadow-md transition cursor-pointer border border-rose-400">
                            ✕
                        </button>
                    </div>
                }
            </div>
        }
    `
})
export class AttachmentPreviewComponent {
    @Input() attachments: PendingAttachment[] = [];
    @Output() remove = new EventEmitter<number>();

    formatSize(bytes: number): string {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}
