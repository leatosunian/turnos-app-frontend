import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgendaPage } from './agenda-page';

describe('AgendaPage', () => {
  let component: AgendaPage;
  let fixture: ComponentFixture<AgendaPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
