import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NegocioPage } from './negocio-page';

describe('NegocioPage', () => {
  let component: NegocioPage;
  let fixture: ComponentFixture<NegocioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NegocioPage],
    }).compileComponents();

    fixture = TestBed.createComponent(NegocioPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
