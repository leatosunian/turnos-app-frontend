import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { BarraInferior } from './barra-inferior/barra-inferior';

@Component({
  imports: [RouterOutlet, Sidebar, BarraInferior],
  selector: 'app-private-layout',
  styleUrl: './private-layout.css',
  templateUrl: './private-layout.html',
})
export class PrivateLayout {
  // /admin usa este mismo layout con data: { admin: true }
  protected readonly admin = inject(ActivatedRoute).snapshot.data['admin'] === true;
}
