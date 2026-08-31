export type WindowId =
  | 'about'
  | 'last-updated'

type Win = {
  id: WindowId;
  el: HTMLElement;
  open: boolean;
  z: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
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
      const x = el.offsetLeft;
      const y = el.offsetTop;
      this.windows.set(id, { id, el, open, z: 0, x, y, homeX: x, homeY: y });
      this.apply(id);

      const bar = el.querySelector<HTMLElement>('.window-header');
      bar?.addEventListener('pointerdown', (e) => this.beginDrag(id, e));
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
    win.x = win.homeX;
    win.y = win.homeY;
    this.raise(id);
    this.apply(id);
    win.el.querySelector<HTMLElement>('.window-header')?.focus();
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

    private beginDrag(id: WindowId, e: PointerEvent) {
    if ((e.target as HTMLElement).closest('[data-close-window]')) return;
    if (e.button !== 0) return;

    const win = this.windows.get(id);
    if (!win?.open) return;

    this.raise(id);

    const originX = e.clientX - win.x;
    const originY = e.clientY - win.y;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      this.move(id, ev.clientX - originX, ev.clientY - originY);
    };
    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
  }

  private move(id: WindowId, x: number, y: number) {
    const win = this.windows.get(id);
    if (!win) return;
    const { x: cx, y: cy } = this.clamp(win, x, y);
    win.x = cx;
    win.y = cy;
    this.apply(id);
  }

  private clamp(win: Win, x: number, y: number) {
    const canvasW = document.documentElement.clientWidth;
    const canvasH = document.documentElement.clientHeight;
    const width = win.el.offsetWidth;
    const height = win.el.offsetHeight;
    const pad = 8;
    const minX = pad + Math.min(0, canvasW - width - pad);
    const minY = pad + Math.min(0, canvasH - height - pad);
    const maxX = Math.max(pad, canvasW - width - pad);
    const maxY = Math.max(pad, canvasH - height - pad);

    return {
      x: Math.min(Math.max(minX, x), maxX),
      y: Math.min(Math.max(minY, y), maxY),
    };
  }

  private apply(id: WindowId) {
    const win = this.windows.get(id);
    if (!win) return;
    win.el.hidden = !win.open;
    win.el.inert = !win.open;
    win.el.style.zIndex = String(win.z);
    win.el.style.left = `${win.x}px`;
    win.el.style.top = `${win.y}px`;
    document
      .querySelector(`[data-open-window="${id}"]`)
      ?.setAttribute('aria-pressed', String(win.open));
  }
}