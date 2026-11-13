import { Injectable, signal } from '@angular/core';

// Tiempo minimo que se ve el loader, contado desde que se empezo a cargar la pagina. Si la app
// carga muy rapido (por ejemplo en localhost tarda unos 300 ms), sin esto el loader apareceria
// y se iria de golpe, como un parpadeo. Con 1200 ms se llega a ver el logo latir un par de veces.
const MINIMO_EN_PANTALLA = 1200;

// Lo que dura la salida del loader. Tiene que coincidir con las transiciones de cargador-saliendo
// en styles.css (el logo tarda 0.5 s y el fondo 0.6 s despues de 0.1 s de espera, o sea 0.7 s).
const DURACION_SALIDA = 700;

// Maneja el loader de pantalla completa que esta en index.html. Ese loader es HTML comun, no un
// componente, para que se vea apenas abre la pagina, antes de que termine de bajar Angular.
//
// Lo usan dos partes:
// - App lo manda a ocultar cuando termina la primera navegacion, o sea cuando ya hay pantalla
//   para mostrar.
// - La directiva Aparecer mira terminado(), asi las animaciones de la portada arrancan recien
//   cuando el loader ya se fue y no quedan escondidas detras.
@Injectable({ providedIn: 'root' })
export class CargadorService {
  private readonly elemento = document.getElementById('cargador');

  // Si no hay loader en la pagina (pasa en los tests, que no cargan index.html) arrancamos como
  // terminado, asi nada se queda esperando algo que nunca va a pasar.
  readonly terminado = signal(!this.elemento);

  ocultar(): void {
    const loader = this.elemento;
    // si ya se mando a ocultar no hacemos nada, por si se llama dos veces
    if (!loader || loader.classList.contains('cargador-saliendo')) return;

    // performance.now() son los ms desde que empezo a cargar la pagina. Si ya paso el minimo,
    // la espera da 0 y sale enseguida. Por ejemplo si la app tardo 400 ms, espera 800 mas.
    const espera = Math.max(0, MINIMO_EN_PANTALLA - performance.now());

    setTimeout(() => {
      // esta clase dispara las transiciones de salida del css
      loader.classList.add('cargador-saliendo');
      setTimeout(() => {
        loader.remove();
        this.terminado.set(true);
      }, DURACION_SALIDA);
    }, espera);
  }
}
