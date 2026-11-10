(() => {
    "use strict";

    /**
     * @typedef {{
     *  [name: string]: string|null|Function|number|boolean|undefined|{[key: string]: unknown},
     * }} Attrs
     */

    /**
     * @template {keyof HTMLElementTagNameMap} T
     * @param {T} tag 
     * @param {Attrs?=} attrs 
     * @param {Array<Element|Text|string|number|null|undefined|boolean>} children 
     * @returns {HTMLElementTagNameMap[T]}
     */
    function h(tag, attrs, ...children) {
        const e = document.createElement(tag);

        if (attrs) {
            for (const name in attrs) {
                const value = attrs[name];

                if (name.startsWith('on') && name.length > 2) {
                    if (typeof value === 'function') {
                        e.addEventListener(name.slice(2), /** @type {any} */ (value));
                    } else {
                        e.addEventListener(name.slice(2), /** @type {any} */ (new Function('event', String(value))));
                    }
                } else if (typeof value === 'object' && value !== null && name === 'dataset') {
                    Object.assign(e.dataset, value);
                } else if (typeof value === 'object' && value !== null && name === 'style') {
                    Object.assign(e.style, value);
                } else if (name.includes('-')) {
                    e.setAttribute(name, String(value));
                } else {
                    /** @type {any} */(e)[name] = value;
                }
            }
        }

        for (const child of children) {
            if (child == null || child === false) {
                continue;
            }

            if (typeof child === 'object' && (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE)) {
                e.appendChild(child);
            } else {
                e.appendChild(document.createTextNode(String(child)));
            }
        }

        return e;
    }

    /**
     * @this {Element}
     * @param {Event} event
     */
    function handleSave(event) {
        const gui = this.closest('.-io-github-panzi--save-table-gui');
        const settings = gui?.querySelector('.-io-github-panzi--save-table-gui--settings');

        if (!gui || !settings) {
            alert('Error: Settings GUI not found!');
            return;
        }

        /** @type {HTMLElement} */ (settings).style.display = 'none';
        gui.querySelector('[name=settings]')?.classList.remove('-io-github-panzi--save-table-gui--active');

        const fileformat = localStorage.getItem('io.github.panzi.save-table.fileformat') || 'csv';
        const lineendings = localStorage.getItem('io.github.panzi.save-table.lineendings') || 'unix';
        const bom = localStorage.getItem('io.github.panzi.save-table.bom') === 'true';

        const lineEnding = lineendings === 'dos' ? '\r\n' : '\n';
        const quoteTest = fileformat === 'csv' ? /[,"\r\n]/g : /[\t"\r\n]/g;
        const contentType = fileformat === 'csv' ? 'text/csv' : 'text/tab-separated-values';
        const delim = fileformat === 'csv' ? ',' : '\t';

        const tableEl = this.closest('table');

        if (!tableEl) {
            alert('Error: Table element not found!');
            return;
        }

        const captionEl = tableEl.caption;

        /** @type {string=} */
        let fileName;

        if (captionEl) {
            /** @type {string[]} */
            const buf = [];

            for (let child = captionEl.firstChild; child; child = child.nextSibling) {
                if (child !== this && child.nodeName !== 'SCRIPT' && child.nodeName !== 'STYLE') {
                    /** @type {string?} */
                    let text;

                    if (child.nodeType === Node.ELEMENT_NODE && /** @type {Element} */ (child).querySelector('script, style')) {
                        const cloneNode = /** @type {Element} */ (child.cloneNode(true));
                        cloneNode.querySelectorAll('script, style').forEach(e => e.remove());
                        text = cloneNode.textContent;
                    } else {
                        text = child.textContent;
                    }

                    if (text !== null) {
                        buf.push(text);
                    }
                }
            }

            fileName = buf.join('').trim();
        }

        if (!fileName) {
            fileName = 'table';
        }

        fileName = `${fileName}.${fileformat}`;

        /** @type {string[]} */
        const buf = [];

        if (bom) {
            buf.push('\ufeff');
        }

        for (const row of tableEl.rows) {
            let first = true;
            for (const cell of row.cells) {
                if (first) {
                    first = false;
                } else {
                    buf.push(delim);
                }

                /** @type {string} */
                let value;
                if (cell.querySelector('script, style, .-io-github-panzi--save-table-gui')) {
                    const cloneCell = /** @type {HTMLElement} */ (cell.cloneNode(true));
                    cloneCell.querySelectorAll('script, style, .-io-github-panzi--save-table-gui').forEach(e => e.remove());
                    value = cloneCell.textContent;
                } else {
                    value = cell.textContent;
                }

                if (quoteTest.test(value)) {
                    buf.push('"');
                    buf.push(value.replaceAll('"', '""'));
                    buf.push('"');
                } else {
                    buf.push(value);
                }
            }
            buf.push(lineEnding);
        }

        const blob = new Blob(buf, { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = h('a', { href: url, download: fileName, style: { position: 'absolute', opacity: 0 } });

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            link.parentElement?.removeChild(link);
            URL.revokeObjectURL(url);
        }, 150);
    }

    /**
     * @this {Element}
     * @param {Event} event
     */
    function handleToggleSettings(event) {
        const gui = this.closest('.-io-github-panzi--save-table-gui');
        const settings = /** @type {HTMLElement?=} */ (gui?.querySelector('.-io-github-panzi--save-table-gui--settings'));

        if (!gui || !settings) {
            alert('Error: Settings GUI not found!');
            return;
        }

        const bnt = gui.querySelector('[name=settings]');
        if (settings.style.display === 'none') {
            loadSettings(settings);
            const inner = /** @type {HTMLElement?=} */ (settings.querySelector('.-io-github-panzi--save-table-gui--settings-inner'));
            if (inner) {
                inner.style.left = '0';
                inner.style.right = 'auto';
            }
            settings.style.display = 'block';
            if (inner) {
                const rect = inner.getBoundingClientRect();
                if (rect.right - window.innerWidth > 2) {
                    inner.style.left = 'auto';
                    inner.style.right = '0';
                }
            }
            bnt?.classList.add('-io-github-panzi--save-table-gui--active');
        } else {
            settings.style.display = 'none';
            bnt?.classList.remove('-io-github-panzi--save-table-gui--active');
        }
    }

    /**
     * @this {HTMLElement}
     * @param {Event} event
     */
    function handleCloseSettings(event) {
        const gui = this.closest('.-io-github-panzi--save-table-gui');
        const settings = gui?.querySelector('.-io-github-panzi--save-table-gui--settings');

        if (!gui || !settings) {
            alert('Error: Settings GUI not found!');
            return;
        }

        gui.querySelector('[name=settings]')?.classList.remove('-io-github-panzi--save-table-gui--active');
        /** @type {HTMLElement} */ (settings).style.display = 'none';
    }

    /**
     * @this {HTMLElement}
     * @param {Event} event
     */
    function handleSettingsChanged(event) {
        const settings = this.closest('.-io-github-panzi--save-table-gui')?.querySelector('.-io-github-panzi--save-table-gui--settings');

        if (!settings) {
            return;
        }

        const fileformat = /** @type {HTMLSelectElement=} */ (settings.querySelector('[name=fileformat]'))?.value || 'csv';
        const lineendings = /** @type {HTMLSelectElement=} */ (settings.querySelector('[name=lineendings]'))?.value || 'unix';
        const bom = /** @type {HTMLInputElement=} */ (settings.querySelector('[name=bom]'))?.checked ?? false;

        localStorage.setItem('io.github.panzi.save-table.fileformat', fileformat);
        localStorage.setItem('io.github.panzi.save-table.lineendings', lineendings);
        localStorage.setItem('io.github.panzi.save-table.bom', String(bom));
    }

    /**
     * @this {HTMLElement}
     * @param {Event} event
     */
    function handleSettingsBackdropClick(event) {
        if (event.target === this) {
            event.preventDefault();
            event.stopPropagation();
            handleCloseSettings.call(this, event);
        }
    }

    /**
     * @param {HTMLElement} settings 
     */
    function loadSettings(settings) {
        const fileformat = localStorage.getItem('io.github.panzi.save-table.fileformat') || 'csv';
        const lineendings = localStorage.getItem('io.github.panzi.save-table.lineendings') || 'unix';
        const bom = localStorage.getItem('io.github.panzi.save-table.bom') === 'true';

        const fileformatEl = /** @type {HTMLSelectElement=} */ (settings.querySelector('[name=fileformat]'));
        const lineendingsEl = /** @type {HTMLSelectElement=} */ (settings.querySelector('[name=lineendings]'));
        const bomEl = /** @type {HTMLInputElement=} */ (settings.querySelector('[name=bom]'));

        if (fileformatEl) {
            fileformatEl.value = fileformat;
        }

        if (lineendingsEl) {
            lineendingsEl.value = lineendings;
        }

        if (bomEl) {
            bomEl.checked = bom;
        }
    }

    /**
     * @returns {HTMLElement}
     */
    function makeGUI() {
        return h('form',
            {
                action: 'javascript:',
                className: '-io-github-panzi--save-table-gui',
                onsubmit: handleSave
            },
            h('button',
                { type: 'submit', name: 'save', title: 'Save Table', ariaLabel: 'Save Table' },
                h('span', { ariaHidden: 'true' }, '\u{1f4be}'),
            ),
            h('button',
                { type: 'button', name: 'settings', title: 'Settings', ariaLabel: 'Settings', onclick: handleToggleSettings },
                h('span', { ariaHidden: 'true' }, '\u{2699}\u{FE0F}'),
            ),
            h('div', {
                className: '-io-github-panzi--save-table-gui--settings',
                style: {
                    display: 'none'
                },
                onclick: handleSettingsBackdropClick
            },
                h('div', { className: '-io-github-panzi--save-table-gui--settings-inner' },
                    h('h2', {}, 'Save Table'),
                    h('div', {},
                        h('label', {},
                            h('span', { className: '-io-github-panzi--save-table-gui--form-left' }, 'File Format: '),
                            h('select', { name: 'fileformat', onchange: handleSettingsChanged },
                                h('option', { value: 'csv', selected: true }, 'CSV'),
                                h('option', { value: 'tsv' }, 'TSV'),
                            )
                        )
                    ),
                    h('div', {},
                        h('label', {},
                            h('span', { className: '-io-github-panzi--save-table-gui--form-left' }, 'Line Endings: '),
                            h('select', { name: 'lineendings', onchange: handleSettingsChanged },
                                h('option', { value: 'unix', selected: true }, 'Unix (\\n)'),
                                h('option', { value: 'dos' }, 'DOS (\\r\\n)'),
                            )
                        )
                    ),
                    h('div', {},
                        h('label', {},
                            h('span', { className: '-io-github-panzi--save-table-gui--form-left' },
                                h('input', { type: 'checkbox', name: 'bom', checked: false, onchange: handleSettingsChanged })
                            ),
                            h('span', {}, 'Byte Order-Mark (BOM)'),
                        )
                    ),
                    h('div',
                        {
                            className: '-io-github-panzi--save-table-gui--buttons',
                        },
                        h('button', { type: 'submit' }, h('span', { ariaHidden: 'true' }, '\u{1f4be}'), ' Save Table'),
                        h('button', { type: 'button', onclick: handleCloseSettings }, h('span', { ariaHidden: 'true' }, '\u{274c}'), ' Close Settings')
                    ),
                )
            )
        );
    }

    {
        document.getElementById('-io-github-panui--save-table--style')?.remove();
        document.head.appendChild(h('style',
            { type: 'text/css', id: '-io-github-panui--save-table--style'},
`
.-io-github-panzi--save-table-gui {
    all: initial;
    position: relative;
    overflow: visible;
    margin: 0 0 0.5rem 0.5rem;
    font-weight: normal;
    font-size: 1rem;
    font-family: sans-serif;
    display: inline-block;
    color: var(--io-github-panzi--color);

    --io-github-panzi--color: black;
    --io-github-panzi--background: white;
    --io-github-panzi--border: #DDDDDD;
    --io-github-panzi--input: #F8F8F8;
    --io-github-panzi--button: #EEEEEE;
    --io-github-panzi--button-active: #DDDDDD;
    --io-github-panzi--button-inset: rgba(0, 0, 0, 0.25);
}

@media (prefers-color-scheme: dark) {
    .-io-github-panzi--save-table-gui {
        --io-github-panzi--color: white;
        --io-github-panzi--background: #111111;
        --io-github-panzi--border: #222222;
        --io-github-panzi--input: #444444;
        --io-github-panzi--button: #333333;
        --io-github-panzi--button-active: #222222;
        --io-github-panzi--button-inset: rgba(0, 0, 0, 1);
    }
}

.-io-github-panzi--save-table-gui h2 {
    font-size: 1.2em;
    margin: 0 0 1em 0;
    padding: 0;
    font-family: inherit;
    color: inherit;
    font-weight: bold;
    border: none;
    border-bottom: 1px solid currentColor;
}

.-io-github-panzi--save-table-gui--settings-inner {
    background: var(--io-github-panzi--background);
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--io-github-panzi--border);
    box-shadow: 0 0 1em rgba(0, 0, 0, 0.5);
    position: absolute;
    top: 100%;
    left: 0;
    text-align: left;
    min-width: 21em;
    z-index: 10001;
}

.-io-github-panzi--save-table-gui--settings:before {
    content: "";
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10000;
}

.-io-github-panzi--save-table-gui input,
.-io-github-panzi--save-table-gui select,
.-io-github-panzi--save-table-gui button {
    color: inherit;
    border: 1px solid var(--io-github-panzi--border);
    border-radius: 0.25em;
    margin: 0;
}

.-io-github-panzi--save-table-gui input,
.-io-github-panzi--save-table-gui select {
    background: var(--io-github-panzi--input);
}

.-io-github-panzi--save-table-gui button {
    background: var(--io-github-panzi--button);
    cursor: pointer;
    padding: 0.25em 0.5em;
    display: inline-block;
    vertical-align: middle;
}

.-io-github-panzi--save-table-gui input[type=checkbox] {
    appearance: none;
    background: var(--io-github-panzi--input);
    color: inherit;
    border: 1px solid var(--io-github-panzi--border);
    width: 1em;
    height: 1em;
    box-sizing: content-box;
    padding: 0;
    position: relative;
    overflow: hidden;
    vertical-align: middle;
    display: inline-block;
    margin: 0;
}

.-io-github-panzi--save-table-gui input[type=checkbox]:checked:after {
    content: "\u{1f7ae}";
    position: absolute;
    text-align: center;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    line-height: 1;
}

.-io-github-panzi--save-table-gui button:active,
.-io-github-panzi--save-table-gui button.-io-github-panzi--save-table-gui--active {
    padding: calc(0.25em + 1px) calc(0.5em - 1px) calc(0.25em - 1px) calc(0.5em + 1px);
    background: var(--io-github-panzi--button-active);
    box-shadow: inset 0 0 0.5em var(--io-github-panzi--button-inset);
}

.-io-github-panzi--save-table-gui > [name=save] {
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.-io-github-panzi--save-table-gui > [name=settings] {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.-io-github-panzi--save-table-gui--form-left {
    text-align: right;
    width: 8em;
    display: inline-block;
    margin: 0 0.5em 0 0;
}

.-io-github-panzi--save-table-gui--buttons {
    display: flex;
    margin: 1rem 0 0 0;
    gap: 0.5em;
    flex-direction: row;
    justify-content: flex-end;
}
`
        ));

        document.querySelectorAll('table').forEach(tableEl => {
            let captionEl = tableEl.caption;
            if (!captionEl) {
                captionEl = h('caption');
                tableEl.prepend(captionEl);
            }

            captionEl.querySelectorAll('.-io-github-panzi--save-table-gui').forEach(e => e.remove());
            captionEl.appendChild(makeGUI());
        });
    }
})();
