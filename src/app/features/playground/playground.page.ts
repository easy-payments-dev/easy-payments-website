import { Component } from '@angular/core';
import { EpButton } from '../../shared/ui/button/button';
import { EpContainer } from '../../shared/ui/container/container';
import { EpEmptyState } from '../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-playground-page',
  imports: [EpContainer, EpEmptyState, EpButton],
  templateUrl: './playground.page.html',
  styleUrl: './playground.page.scss',
})
export class PlaygroundPage {}
