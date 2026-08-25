import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'fz-media-viewer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn"
             (click)="close.emit()">
            <!-- Top Controls -->
            <div class="absolute top-4 right-4 flex items-center gap-3 z-10" (click)="$event.stopPropagation()">
                <a [href]="src" [download]="title || 'download'" target="_blank"
                   class="p-2.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/50 shadow-lg"
                   title="Mở trong tab mới / Tải xuống">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </a>
                <button (click)="close.emit()"
                        class="p-2.5 rounded-full bg-zinc-800/80 hover:bg-rose-600/80 text-zinc-300 hover:text-white transition cursor-pointer border border-zinc-700/50 shadow-lg"
                        title="Đóng">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Media Content -->
            <div class="max-w-[90vw] max-h-[85vh] flex flex-col items-center justify-center" (click)="$event.stopPropagation()">
                @if (type === 'image' || type === 'gif') {
                    <img [src]="src" [alt]="title || 'Hình ảnh'"
                         class="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-zinc-800/80 select-none animate-zoomIn" />
                } @else if (type === 'video') {
                    <video [src]="src" controls autoplay class="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-zinc-800"></video>
                }

                @if (title) {
                    <div class="mt-3 text-xs text-zinc-400 font-medium px-4 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800">
                        {{ title }}
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes zoomIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-zoomIn {
            animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
    `]
})
export class MediaViewerComponent {
    @Input() src: string = '';
    @Input() type: 'image' | 'gif' | 'video' = 'image';
    @Input() title: string = '';
    @Output() close = new EventEmitter<void>();
}
