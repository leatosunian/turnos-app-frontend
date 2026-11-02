import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IngresarPage } from './ingresar-page';

describe('IngresarPage', () => {
  let component: IngresarPage;
  let fixture: ComponentFixture<IngresarPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngresarPage],
    }).compileComponents();

    fixture = TestBed.createComponent(IngresarPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
