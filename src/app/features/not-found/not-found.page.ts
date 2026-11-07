import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
})
export class NotFoundPage {
  protected readonly siteName = environment.siteName;
}
