import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoEncontradoPage } from './no-encontrado-page';

describe('NoEncontradoPage', () => {
  let component: NoEncontradoPage;
  let fixture: ComponentFixture<NoEncontradoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoEncontradoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(NoEncontradoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
