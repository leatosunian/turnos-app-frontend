import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiNegocioPage } from './mi-negocio-page';

describe('MiNegocioPage', () => {
  let component: MiNegocioPage;
  let fixture: ComponentFixture<MiNegocioPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiNegocioPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MiNegocioPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
