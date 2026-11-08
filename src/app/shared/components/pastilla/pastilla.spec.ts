import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pastilla } from './pastilla';

describe('Pastilla', () => {
  let fixture: ComponentFixture<Pastilla>;

  const clases = () => (fixture.nativeElement as HTMLElement).classList;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Pastilla] }).compileComponents();
    fixture = TestBed.createComponent(Pastilla);
    await fixture.whenStable();
  });

  it('es neutra si no se aclara el tono', () => {
    expect(clases()).toContain('bg-surface-3');
    expect(clases()).toContain('rounded-full');
  });

  it('aplica el tono cielo, el de Futuro', async () => {
    fixture.componentRef.setInput('tono', 'cielo');
    await fixture.whenStable();
    expect(clases()).toContain('bg-info-soft');
    expect(clases()).not.toContain('bg-surface-3');
  });
});
