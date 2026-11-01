import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminNegociosPage } from './admin-negocios-page';

describe('AdminNegociosPage', () => {
  let component: AdminNegociosPage;
  let fixture: ComponentFixture<AdminNegociosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNegociosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminNegociosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
