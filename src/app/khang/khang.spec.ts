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

  it('should toggle the theme between dark and light', () => {
    component.toggleTheme();
    expect(component.isDarkMode).toBeFalse();
    expect(component.feedback).toContain('sáng');

    component.toggleTheme();
    expect(component.isDarkMode).toBeTrue();
    expect(component.feedback).toContain('tối');
  });
});
