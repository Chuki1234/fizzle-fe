import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Khang } from './khang';

describe('Khang', () => {
  let component: Khang;
  let fixture: ComponentFixture<Khang>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Khang],
    }).compileComponents();

    fixture = TestBed.createComponent(Khang);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
