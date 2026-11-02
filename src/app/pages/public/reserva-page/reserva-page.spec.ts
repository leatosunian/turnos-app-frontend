import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReservaPage } from './reserva-page';

describe('ReservaPage', () => {
  let component: ReservaPage;
  let fixture: ComponentFixture<ReservaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservaPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
