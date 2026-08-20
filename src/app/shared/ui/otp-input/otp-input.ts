import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'fz-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './otp-input.html',
  styleUrl: './otp-input.css',
})
export class OtpInput implements AfterViewInit {
  readonly length = input<number>(6);
  readonly invalid = input<boolean>(false);
  readonly value = model<string>('');
  readonly completed = output<string>();

  protected readonly cells = signal<string[]>([]);

  @ViewChildren('cell') private readonly cellRefs!: QueryList<ElementRef<HTMLInputElement>>;

  ngAfterViewInit(): void {
    this.initCells();
  }

  protected initCells(): void {
    const len = this.length();
    const existing = this.value() ?? '';
    this.cells.set(Array.from({ length: len }, (_, i) => existing[i] ?? ''));
  }

  protected onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 1) val = val.slice(-1);
    const cells = [...this.cells()];
    cells[index] = val;
    this.cells.set(cells);
    this.emitValue(cells);
    if (val && index < this.length() - 1) {
      this.focusCell(index + 1);
    }
  }

  protected onKeyDown(index: number, event: KeyboardEvent): void {
    const cells = [...this.cells()];
    if (event.key === 'Backspace') {
      if (cells[index]) {
        cells[index] = '';
        this.cells.set(cells);
        this.emitValue(cells);
      } else if (index > 0) {
        cells[index - 1] = '';
        this.cells.set(cells);
        this.emitValue(cells);
        this.focusCell(index - 1);
      }
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft' && index > 0) { this.focusCell(index - 1); event.preventDefault(); }
    if (event.key === 'ArrowRight' && index < this.length() - 1) { this.focusCell(index + 1); event.preventDefault(); }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, this.length());
    if (!digits) return;
    const cells = [...this.cells()];
    for (let i = 0; i < digits.length; i++) { cells[i] = digits[i]; }
    this.cells.set(cells);
    this.emitValue(cells);
    const nextEmpty = cells.findIndex((c) => !c);
    this.focusCell(nextEmpty === -1 ? this.length() - 1 : nextEmpty);
  }

  protected onFocus(index: number): void {
    const el = this.getCellEl(index);
    if (el) setTimeout(() => el.select(), 0);
  }

  private focusCell(index: number): void {
    const el = this.getCellEl(index);
    if (el) setTimeout(() => el.focus(), 0);
  }

  private getCellEl(index: number): HTMLInputElement | null {
    return this.cellRefs?.toArray()[index]?.nativeElement ?? null;
  }

  private emitValue(cells: string[]): void {
    const code = cells.join('');
    this.value.set(code);
    if (code.length === this.length() && cells.every((c) => c)) {
      this.completed.emit(code);
    }
  }

  reset(): void {
    this.cells.set(Array.from({ length: this.length() }, () => ''));
    this.value.set('');
    this.focusCell(0);
  }
}
