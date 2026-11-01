import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRubrosPage } from './admin-rubros-page';

describe('AdminRubrosPage', () => {
  let component: AdminRubrosPage;
  let fixture: ComponentFixture<AdminRubrosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRubrosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRubrosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
