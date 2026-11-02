import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HorariosPage } from './horarios-page';

describe('HorariosPage', () => {
  let component: HorariosPage;
  let fixture: ComponentFixture<HorariosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorariosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(HorariosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
