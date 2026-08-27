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
            <div class="p-3 bg-[#121318] border-b border-[#22242b]">
                <!-- Header -->
                <div class="flex items-center justify-between mb-2.5 px-1">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span class="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                            Tệp đính kèm ({{ attachments.length }})
                        </span>
                    </div>
                    @if (attachments.length > 1) {
                        <button type="button"
                                (click)="clearAll.emit()"
                                class="text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:underline transition cursor-pointer">
                            Xóa tất cả
                        </button>
                    }
                </div>

                <!-- Attachment Cards Scroll List -->
                <div class="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    @for (item of attachments; track $index) {
                        @let ext = getFileExt(item.name);
                        @let cat = getFileCategory(item.name, item.type);
                        <div class="relative group/card shrink-0 flex items-center gap-3 p-2.5 bg-[#181a22] hover:bg-[#1f212c] border border-[#292c3a] hover:border-emerald-500/40 rounded-2xl min-w-[220px] max-w-[280px] shadow-md transition duration-200">
                            
                            <!-- Thumbnail / Icon -->
                            <div class="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center border"
                                 [class.border-zinc-700]="item.type === 'image'"
                                 [class.bg-rose-500\/15]="cat === 'pdf'"
                                 [class.border-rose-500\/30]="cat === 'pdf'"
                                 [class.text-rose-400]="cat === 'pdf'"
                                 [class.bg-blue-500\/15]="cat === 'doc'"
                                 [class.border-blue-500\/30]="cat === 'doc'"
                                 [class.text-blue-400]="cat === 'doc'"
                                 [class.bg-emerald-500\/15]="cat === 'sheet'"
                                 [class.border-emerald-500\/30]="cat === 'sheet'"
                                 [class.text-emerald-400]="cat === 'sheet'"
                                 [class.bg-amber-500\/15]="cat === 'archive'"
                                 [class.border-amber-500\/30]="cat === 'archive'"
                                 [class.text-amber-400]="cat === 'archive'"
                                 [class.bg-cyan-500\/15]="cat === 'code'"
                                 [class.border-cyan-500\/30]="cat === 'code'"
                                 [class.text-cyan-400]="cat === 'code'"
                                 [class.bg-purple-500\/15]="cat === 'audio'"
                                 [class.border-purple-500\/30]="cat === 'audio'"
                                 [class.text-purple-400]="cat === 'audio'"
                                 [class.bg-indigo-500\/15]="cat === 'video'"
                                 [class.border-indigo-500\/30]="cat === 'video'"
                                 [class.text-indigo-400]="cat === 'video'"
                                 [class.bg-zinc-800]="cat === 'file'"
                                 [class.border-zinc-700]="cat === 'file'"
                                 [class.text-zinc-300]="cat === 'file'">

                                @if (item.type === 'image') {
                                    <img [src]="item.previewUrl" class="w-full h-full object-cover rounded-xl" alt="Preview" />
                                    <span class="absolute bottom-0 inset-x-0 text-[9px] font-black uppercase text-center bg-black/70 text-zinc-300 py-0.5 backdrop-blur-xs">
                                        {{ ext || 'IMG' }}
                                    </span>
                                } @else if (cat === 'pdf') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">📄</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">PDF</span>
                                    </div>
                                } @else if (cat === 'doc') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">📝</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'DOC' }}</span>
                                    </div>
                                } @else if (cat === 'sheet') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">📊</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'XLS' }}</span>
                                    </div>
                                } @else if (cat === 'archive') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">📦</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'ZIP' }}</span>
                                    </div>
                                } @else if (cat === 'code') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">💻</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'CODE' }}</span>
                                    </div>
                                } @else if (cat === 'audio') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">🎵</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'AUDIO' }}</span>
                                    </div>
                                } @else if (cat === 'video') {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">🎬</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'VIDEO' }}</span>
                                    </div>
                                } @else {
                                    <div class="flex flex-col items-center">
                                        <span class="text-base leading-none">📁</span>
                                        <span class="text-[9px] font-black tracking-wider uppercase mt-0.5">{{ ext || 'FILE' }}</span>
                                    </div>
                                }
                            </div>

                            <!-- Info -->
                            <div class="flex flex-col min-w-0 flex-1 pr-5">
                                <span class="text-xs font-semibold text-zinc-100 truncate" [title]="item.name">
                                    {{ item.name }}
                                </span>
                                <div class="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                                    <span>{{ formatSize(item.size) }}</span>
                                    <span>•</span>
                                    <span class="uppercase font-medium text-emerald-400/90">{{ ext || 'Tập tin' }}</span>
                                </div>
                            </div>

                            <!-- Remove button -->
                            <button type="button"
                                    (click)="remove.emit($index)"
                                    class="absolute top-2 right-2 w-6 h-6 rounded-full bg-zinc-800/90 hover:bg-rose-600 text-zinc-400 hover:text-white flex items-center justify-center text-xs shadow-md transition cursor-pointer border border-zinc-700/60 hover:border-rose-500"
                                    title="Gỡ bỏ">
                                ✕
                            </button>
                        </div>
                    }
                </div>
            </div>
        }
    `,
    styles: [`
        .scrollbar-thin::-webkit-scrollbar {
            height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #2e3240;
            border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
        }
    `]
})
export class AttachmentPreviewComponent {
    @Input() attachments: PendingAttachment[] = [];
    @Output() remove = new EventEmitter<number>();
    @Output() clearAll = new EventEmitter<void>();

    formatSize(bytes: number): string {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getFileExt(name?: string): string {
        if (!name) return '';
        const parts = name.split('.');
        if (parts.length <= 1) return '';
        return parts[parts.length - 1].toUpperCase();
    }

    getFileCategory(name?: string, type?: string): string {
        if (type === 'image') return 'image';
        if (type === 'video') return 'video';
        if (type === 'audio') return 'audio';
        const ext = (this.getFileExt(name) || '').toLowerCase();
        if (['pdf'].includes(ext)) return 'pdf';
        if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(ext)) return 'doc';
        if (['xls', 'xlsx', 'csv', 'tsv', 'numbers'].includes(ext)) return 'sheet';
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) return 'archive';
        if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'sql', 'sh', 'yaml', 'yml', 'xml'].includes(ext)) return 'code';
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext)) return 'audio';
        if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) return 'video';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image';
        return 'file';
    }
}
