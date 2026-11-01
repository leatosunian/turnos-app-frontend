import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiciosPage } from './servicios-page';

describe('ServiciosPage', () => {
  let component: ServiciosPage;
  let fixture: ComponentFixture<ServiciosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiciosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiciosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
