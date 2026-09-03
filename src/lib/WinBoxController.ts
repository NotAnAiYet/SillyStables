import WinBox from 'winbox/src/js/winbox.js';
import ie from '../assets/media/icons/ie.ico';
import wordpad from '../assets/media/icons/Wordpad.png'
import textDoc from '../assets/media/icons/Text-Doc.png';

type Win = {
    content: HTMLElement;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
};

const backgroundColor = '#0056e4';

const iconMap: Record<string, string> = {
    "about": ie,
    "guestbook": ie,
    "favorites": wordpad.src,
    "last-updated": textDoc.src,
};

export class WinBoxController {
    private windows = new Map<string, Win>();
    private toBeDeleted: HTMLElement[] = [];

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

            this.toBeDeleted.push(el);
        }

        for (const el of this.toBeDeleted) {
            el.remove();
        }

        initWinBoxStartup(this.windows);
    }
}

export function initWinBoxStartup(windows: Map<string, Win> = new Map()) {
    const defaultOpen: ReadonlySet<string> = new Set(['about', 'last-updated', 'favorites', 'guestbook']);

    windows.forEach((win, id) => {
        if (defaultOpen.has(id)) {
            initWindow(id, win);
        }
        // Add event listeners to open button for this window
        const openBtn = document.querySelector<HTMLElement>(`[data-open-window="${id}"]`);
        openBtn?.addEventListener('click', () => {
            if (document.getElementById(id+'-winbox')) {
                return;
            }
            
            initWindow(id, win);
        });
    });
};

function initWindow(id: string, win: Win) {
    var winbox = new WinBox({
        id: id + '-winbox',
        title: win.title,
        background: backgroundColor,
        x: win.x,
        y: win.y,
        width: win.width + 'px',
        height: win.height + 'px',
        mount: win.content.cloneNode(true),
        border: "0.4em"
    });

    winbox.removeControl("wb-full");

    if (iconMap[id]) {
        console.log(`Setting icon for window "${id}" to "${iconMap[id]}"`);
        winbox.setIcon(iconMap[id]);
    }
}
