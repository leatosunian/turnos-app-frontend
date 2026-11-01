import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminUsuariosPage } from './admin-usuarios-page';

describe('AdminUsuariosPage', () => {
  let component: AdminUsuariosPage;
  let fixture: ComponentFixture<AdminUsuariosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuariosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsuariosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
