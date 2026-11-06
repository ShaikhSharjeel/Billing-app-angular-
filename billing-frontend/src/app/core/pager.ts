import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pager',
  template: `
    @if (pages() > 1) {
      <div class="pager">
        <button class="btn" [disabled]="page() <= 1" (click)="go.emit(page() - 1)">Prev</button>
        <span>Page {{ page() }} / {{ pages() }}</span>
        <button class="btn" [disabled]="page() >= pages()" (click)="go.emit(page() + 1)">Next</button>
      </div>
    }
  `,
})
export class Pager {
  page = input.required<number>();
  total = input.required<number>();
  size = input(15);
  go = output<number>();
  pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
}
