import { TestBed } from '@angular/core/testing';
import { MenuMasEstado } from './menu-mas-estado';

describe('MenuMasEstado', () => {
  it('abre, cierra y alterna el menú', () => {
    const menu = TestBed.inject(MenuMasEstado);
    expect(menu.abierto()).toBe(false);

    menu.abrir();
    expect(menu.abierto()).toBe(true);
    menu.alternar();
    expect(menu.abierto()).toBe(false);
    menu.alternar();
    menu.cerrar();
    expect(menu.abierto()).toBe(false);
  });
});
