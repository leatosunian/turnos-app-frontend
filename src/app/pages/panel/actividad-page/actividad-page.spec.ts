import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActividadPage } from './actividad-page';

describe('ActividadPage', () => {
  let component: ActividadPage;
  let fixture: ComponentFixture<ActividadPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActividadPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ActividadPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
