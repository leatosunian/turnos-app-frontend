import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadisticasPage } from './estadisticas-page';

describe('EstadisticasPage', () => {
  let component: EstadisticasPage;
  let fixture: ComponentFixture<EstadisticasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EstadisticasPage],
    }).compileComponents();

    fixture = TestBed.createComponent(EstadisticasPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
