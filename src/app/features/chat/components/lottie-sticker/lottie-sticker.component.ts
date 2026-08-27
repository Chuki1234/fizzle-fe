import {
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ViewChild,
    AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import lottie, { AnimationItem } from 'lottie-web';

@Component({
    selector: 'fz-lottie-sticker',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div #container class="lottie-container cursor-pointer select-none" [style.width.px]="width" [style.height.px]="height">
            @if (loading) {
                <div class="w-full h-full flex items-center justify-center bg-zinc-900/40 rounded-xl animate-pulse">
                    <span class="text-xs text-zinc-600">✨</span>
                </div>
            }
        </div>
    `,
    styles: [`
        :host {
            display: inline-block;
        }
        .lottie-container {
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            transition: transform 0.2s ease;
        }
        .lottie-container:hover {
            transform: scale(1.05);
        }
    `]
})
export class LottieStickerComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

    @Input() animationUrl: string = '';
    @Input() animationData: any = null;
    @Input() loop: boolean = true;
    @Input() autoplay: boolean = true;
    @Input() width: number = 130;
    @Input() height: number = 130;

    loading: boolean = true;
    private animItem?: AnimationItem;

    ngAfterViewInit() {
        this.loadAnimation();
    }

    ngOnChanges(changes: SimpleChanges) {
        if ((changes['animationUrl'] && !changes['animationUrl'].isFirstChange()) ||
            (changes['animationData'] && !changes['animationData'].isFirstChange())) {
            this.loadAnimation();
        }
    }

    private loadAnimation() {
        if (!this.containerRef?.nativeElement) return;

        if (this.animItem) {
            this.animItem.destroy();
            this.animItem = undefined;
        }

        this.loading = true;

        try {
            if (this.animationData) {
                this.animItem = lottie.loadAnimation({
                    container: this.containerRef.nativeElement,
                    renderer: 'svg',
                    loop: this.loop,
                    autoplay: this.autoplay,
                    animationData: this.animationData
                });
                this.loading = false;
            } else if (this.animationUrl) {
                this.animItem = lottie.loadAnimation({
                    container: this.containerRef.nativeElement,
                    renderer: 'svg',
                    loop: this.loop,
                    autoplay: this.autoplay,
                    path: this.animationUrl
                });

                this.animItem.addEventListener('DOMLoaded', () => {
                    this.loading = false;
                });
                this.animItem.addEventListener('data_failed', () => {
                    this.loading = false;
                });
            }
        } catch (e) {
            console.warn('Lottie load failed:', e);
            this.loading = false;
        }
    }

    ngOnDestroy() {
        if (this.animItem) {
            this.animItem.destroy();
        }
    }
}
