import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HoyPage } from './hoy-page';

describe('HoyPage', () => {
  let component: HoyPage;
  let fixture: ComponentFixture<HoyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoyPage],
    }).compileComponents();

    fixture = TestBed.createComponent(HoyPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
