import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el link Ingresar lleva a /ingresar', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const ingresar = links.find((a) => a.textContent?.trim() === 'Ingresar');
    expect(ingresar?.getAttribute('href')).toBe('/ingresar');
  });
});
