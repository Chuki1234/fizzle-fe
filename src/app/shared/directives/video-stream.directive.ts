import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appVideoStream]',
  standalone: true,
})
export class VideoStreamDirective implements OnChanges {
  @Input('appVideoStream') stream: MediaStream | null | undefined;

  constructor(private el: ElementRef<HTMLVideoElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stream']) {
      const video = this.el.nativeElement;
      const newStream = changes['stream'].currentValue as MediaStream | null | undefined;
      if (newStream) {
        video.srcObject = newStream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => {});
      } else {
        video.srcObject = null;
        video.pause();
      }
    }
  }
}
