import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoEncontradoPage } from './no-encontrado-page';

@Component({ template: '' })
class Vacia {}

describe('NoEncontradoPage', () => {
  let harness: RouterTestingHarness;

  const texto = () => harness.routeNativeElement!.textContent ?? '';
  const tachado = () =>
    harness.routeNativeElement!.querySelector('.line-through')?.textContent?.trim();

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'mis-turnos', component: Vacia },
          { path: '**', component: NoEncontradoPage },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('con un solo tramo habla del negocio y tacha el slug', async () => {
    await harness.navigateByUrl('/estudio-malbek?ref=ig');

    expect(tachado()).toBe('estudio-malbek');
    expect(texto()).toContain('No encontramos ese negocio.');
    expect(texto()).toContain('se haya dado de baja');
  });

  it('con una ruta más larga habla de la página', async () => {
    await harness.navigateByUrl('/panel/no-existe');

    expect(tachado()).toBe('panel/no-existe');
    expect(texto()).toContain('No encontramos esa página.');
  });

  it('lleva al inicio y a mis turnos', async () => {
    await harness.navigateByUrl('/x');
    const links = [...harness.routeNativeElement!.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );

    expect(links).toEqual(['/', '/mis-turnos']);
  });

  it('usa el link que le pasan cuando va dentro de otra pantalla', async () => {
    const fixture: ComponentFixture<NoEncontradoPage> = TestBed.createComponent(NoEncontradoPage);
    fixture.componentRef.setInput('link', '/estudio-cerrado');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.line-through').textContent.trim()).toBe(
      'estudio-cerrado',
    );
  });
});
