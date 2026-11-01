import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';

@Component({
  imports: [RouterOutlet, Sidebar],
  selector: 'app-private-layout',
  styleUrl: './private-layout.css',
  templateUrl: './private-layout.html',
})
export class PrivateLayout {
  protected readonly menuAbierto = signal(false);
}