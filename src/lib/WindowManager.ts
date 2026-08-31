export type WindowId =
  | 'about'
  | 'last-updated'

type Win = {
  id: WindowId;
  el: HTMLElement;
  open: boolean;
  z: number;
};

const DEFAULT_OPEN: ReadonlySet<WindowId> = new Set(['about', 'last-updated']);
const DESKTOP_MQ = '(min-width: 992px)'; // skip windows on phones

export class WindowManager {
  private windows = new Map<WindowId, Win>();
  private topZ = 1;

  constructor(root: ParentNode = document) {
    if (!window.matchMedia(DESKTOP_MQ).matches) return;

    for (const el of root.querySelectorAll<HTMLElement>('[data-window]')) {
      const id = el.dataset.window as WindowId;
      const open = DEFAULT_OPEN.has(id);
      this.windows.set(id, { id, el, open, z: 0 });
      this.apply(id);
    }

    root.querySelectorAll<HTMLElement>('[data-close-window]').forEach((btn) => {
      btn.addEventListener('click', () => this.close(btn.dataset.closeWindow as WindowId));
    });

    root.querySelectorAll<HTMLElement>('[data-open-window]').forEach((btn) => {
      btn.addEventListener('click', () => this.open(btn.dataset.openWindow as WindowId));
    });

    for (const { el, id } of this.windows.values()) {
      el.addEventListener('pointerdown', () => this.raise(id));
    }
  }

  open(id: WindowId) {
    const win = this.windows.get(id);
    if (!win) return;
    win.open = true;
    this.raise(id);
    this.apply(id);
    win.el.querySelector<HTMLElement>('.window-titlebar')?.focus();
  }

  close(id: WindowId) {
    const win = this.windows.get(id);
    if (!win) return;
    win.open = false;
    this.apply(id);
  }

  raise(id: WindowId) {
    const win = this.windows.get(id);
    if (!win?.open) return;
    win.z = ++this.topZ;
    this.apply(id);
  }

  private apply(id: WindowId) {
    const win = this.windows.get(id);
    if (!win) return;
    win.el.hidden = !win.open;
    win.el.inert = !win.open;
    win.el.style.zIndex = String(win.z);
    document
      .querySelector(`[data-open-window="${id}"]`)
      ?.setAttribute('aria-pressed', String(win.open));
  }
}