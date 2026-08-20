import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KProfile } from './k-profile';

describe('KProfile', () => {
  let component: KProfile;
  let fixture: ComponentFixture<KProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(KProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
