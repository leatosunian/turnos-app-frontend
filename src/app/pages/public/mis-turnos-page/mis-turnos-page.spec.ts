import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MisTurnosPage } from './mis-turnos-page';

describe('MisTurnosPage', () => {
  let component: MisTurnosPage;
  let fixture: ComponentFixture<MisTurnosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisTurnosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MisTurnosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
