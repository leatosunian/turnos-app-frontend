import {
  computed,
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { CargadorService } from '../../core/services/cargador-service';

// Hace aparecer un elemento cuando entra en pantalla al scrollear: arranca transparente y un
// poco mas abajo, y cuando se ve sube a su lugar con un fundido. Lo usa la landing en cada
// bloque (titulos, pasos, tarjetas de funciones, chips de rubros y el cierre).
//
// Se usa asi: appAparecer solo, o con un retraso en milisegundos para escalonar varios
// elementos de la misma seccion. Por ejemplo, con tres pasos que tienen appAparecer en 0, 120
// y 240, el segundo arranca 120 ms despues del primero y se ven caer uno detras del otro.
//
// Los estilos estan en styles.css (clases aparecer y aparecer-visible), porque la directiva se
// puede usar desde cualquier pagina.
//
// Para saber cuando el elemento entra en pantalla usamos IntersectionObserver, que avisa sin
// tener que escuchar el scroll a cada rato. Una vez que aparecio dejamos de observarlo: si el
// usuario vuelve a subir, el bloque se queda visible y no se anima de nuevo.
@Directive({
  selector: '[appAparecer]',
  host: {
    class: 'aparecer',
    '[class.aparecer-visible]': 'visible()',
    '[style.--retraso]': 'retraso() + "ms"',
  },
})
export class Aparecer {
  // retraso en ms antes de arrancar la animacion. Si se pone appAparecer sin valor llega un
  // texto vacio, que numberAttribute convierte en el 0 que le pasamos como valor por defecto
  readonly retraso = input(0, {
    alias: 'appAparecer',
    transform: (valor: unknown) => numberAttribute(valor, 0),
  });

  // si el elemento ya entro en pantalla alguna vez
  private readonly enPantalla = signal(false);

  // Se muestra cuando entro en pantalla y ademas ya se fue el loader de inicio. Lo segundo es
  // por la portada: esta en pantalla desde el principio, y sin esta condicion se animaria
  // detras del loader y el usuario no la veria. Las secciones de mas abajo no cambian, porque
  // para cuando se scrollea hasta ellas el loader ya no esta.
  private readonly cargador = inject(CargadorService);
  protected readonly visible = computed(() => this.enPantalla() && this.cargador.terminado());

  constructor() {
    const elemento: HTMLElement = inject(ElementRef).nativeElement;

    // en los tests (jsdom) y en navegadores muy viejos no existe IntersectionObserver, asi que
    // mostramos el elemento directo. Lo importante es que el contenido nunca quede invisible
    if (typeof IntersectionObserver === 'undefined') {
      this.enPantalla.set(true);
      return;
    }

    // rootMargin con -10% abajo hace que el bloque aparezca cuando ya entro un poco en la
    // pantalla y no justo cuando asoma el primer pixel, si no la animacion pasa sin que se vea
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          this.enPantalla.set(true);
          observador.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );

    // esperamos al primer render para que el elemento ya este en la pagina y tenga tamaño
    afterNextRender(() => observador.observe(elemento));
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }
}
