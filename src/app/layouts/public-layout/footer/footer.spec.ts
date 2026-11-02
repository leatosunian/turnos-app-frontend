import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Footer } from './footer';

describe('Footer', () => {
  let component: Footer;
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Footer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('el botón Comenzar lleva a /ingresar', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    const comenzar = links.find((a) => a.textContent?.trim() === 'Comenzar');
    expect(comenzar?.getAttribute('href')).toBe('/ingresar');
  });
});
