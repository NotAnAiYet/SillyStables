import WinBox from 'winbox/src/js/winbox.js';

type Win = {
  content: HTMLElement;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
};

export class WinBoxController {
    private windows = new Map<string, Win>();

    constructor(root: ParentNode = document) {
        for (const el of root.querySelectorAll<HTMLElement>('[data-window]')) {
            const id = el.dataset.window as string;
            const title = el.querySelector<HTMLElement>('.window-header strong')?.textContent || '';
            const content = el.querySelector<HTMLElement>('.window-content');
            
            console.log(`WinBoxController: Found window with id "${id}" and title "${title}"`);
            if (!content) continue;

            this.windows.set(id, {
                content,
                x: el.offsetLeft,
                y: el.offsetTop,
                width: el.offsetWidth,
                height: el.offsetHeight,
                title: title
            });
            el.hidden = true;
        }
        
        initWinBoxStartup(this.windows);
    }
}

export function initWinBoxStartup(windows: Map<string, Win> = new Map()) {
    const defaultOpen: ReadonlySet<string> = new Set(['about', 'last-updated']);

    windows.forEach((win, id) => {
        if (defaultOpen.has(id)) {
            new WinBox({
                title: win.title,
                background: '#0056e4',
                x: win.x,
                y: win.y,
                width: win.width + 'px',
                height: win.height + 'px',
                mount: win.content.cloneNode(true),
            });
        }
        // Add event listeners to open button for this window
        const openBtn = document.querySelector<HTMLElement>(`[data-open-window="${id}"]`);
        openBtn?.addEventListener('click', () => {
            new WinBox({
                title: win.title,
                background: '#0056e4',
                x: win.x,
                y: win.y,
                width: win.width + 'px',
                height: win.height + 'px',
                mount: win.content.cloneNode(true),
            });
        });
    });
};