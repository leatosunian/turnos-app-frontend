import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComponentesPage } from './componentes-page';

describe('ComponentesPage', () => {
  let component: ComponentesPage;
  let fixture: ComponentFixture<ComponentesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComponentesPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
