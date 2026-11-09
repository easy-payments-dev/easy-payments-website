import { Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SiteI18nService } from '../../core/i18n/site-i18n.service';
import { SiteMessageKey } from '../../core/i18n/site-messages';
import { EpContainer } from '../../shared/ui/container/container';
import { SupportProjectCard } from '../../shared/support/support-project-card';
import { FAQ_CONTENT } from './faq.content';

@Component({
  selector: 'app-faq-page',
  imports: [RouterLink, EpContainer, SupportProjectCard],
  templateUrl: './faq.page.html',
  styleUrl: './faq.page.scss',
})
export class FaqPage {
  private readonly i18n = inject(SiteI18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly language = this.i18n.language;
  protected readonly items = computed(() => FAQ_CONTENT[this.language()]);

  constructor() {
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      // Defer until details nodes exist (fresh navigation / SSR hydrate).
      queueMicrotask(() => this.expandFragment(fragment));
      // Second pass covers slower client hydration without binding [open] (keeps native toggle).
      requestAnimationFrame(() => this.expandFragment(fragment));
    });
  }

  protected t(key: SiteMessageKey): string {
    return this.i18n.t(key);
  }

  protected isExternal(href: string): boolean {
    return /^https?:\/\//i.test(href);
  }

  protected questionHref(id: string): string {
    return `/faq#${id}`;
  }

  private expandFragment(fragment: string | null): void {
    if (!fragment || typeof document === 'undefined') {
      return;
    }
    const el = document.getElementById(fragment);
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
}
