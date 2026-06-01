// @ts-check
/** @import {TemplateMakerProps, AllProps, FeatureSpawnContext, TemplateSource} from './types/templ-maker/types' */

/**
 * Symbol key used to store the template on the custom element constructor.
 */
const templateSym = Symbol.for('templ-maker:template');

/**
 * Symbol key used to store the template source type on the constructor.
 */
const templateSourceSym = Symbol.for('templ-maker:templateSource');

/**
 * Symbol key used to store adopted CSSStyleSheets on the constructor.
 */
const adoptedSheetsSym = Symbol.for('templ-maker:adoptedStylesheets');

/**
 * TemplateMaker is a custom element feature that captures the initial DOM
 * fragment from a "seed" element (the first instance defined via a cede script),
 * stores it as a template on the constructor, and provides cloning/appending
 * capabilities to all subsequent instances.
 *
 * @implements {TemplateMakerProps}
 */
class TemplateMaker {
    /** @type {WeakRef<Element> | undefined} */
    #hostRef;

    /** @type {DocumentFragment | null} */
    #clone = null;

    /**
     * @param {Element} hostElement
     * @param {FeatureSpawnContext} ctx
     * @param {Partial<TemplateMakerProps>} [initVals]
     */
    constructor(hostElement, ctx, initVals) {
        this.#hostRef = new WeakRef(hostElement);
        const ctr = /** @type {any} */ (hostElement.constructor);
        const template = /** @type {HTMLTemplateElement | undefined} */ (ctr[templateSym]);
        if (template) {
            this.#clone = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
            /** @type {any} */ (hostElement).clone = this.#clone;
        }
        if (initVals) {
            Object.assign(this, initVals);
        }
    }

    /**
     * The cloned DocumentFragment from the stored template.
     */
    get clone() {
        return this.#clone;
    }

    /**
     * Appends the clone to the host element's shadow root (if the template
     * originated from a shadow root) or to the element itself (light DOM).
     *
     * After appending, replaces host.clone with the ShadowRoot or the host
     * element itself so the consumer can continue "updating the clone" conceptually.
     */
    append() {
        const host = this.#hostRef?.deref();
        if (!host || !this.#clone) return;
        const ctr = /** @type {any} */ (host.constructor);
        const source = /** @type {TemplateSource | undefined} */ (ctr[templateSourceSym]);
        if (source === 'shadow') {
            let shadowRoot = host.shadowRoot;
            if (!shadowRoot) {
                shadowRoot = host.attachShadow({ mode: 'open' });
            }
            shadowRoot.appendChild(this.#clone);
            // Apply adopted stylesheets if any were extracted during onAssigned
            const sheets = /** @type {CSSStyleSheet[] | undefined} */ (ctr[adoptedSheetsSym]);
            if (sheets) {
                shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, ...sheets];
            }
            /** @type {any} */ (host).clone = shadowRoot;
        } else {
            host.appendChild(this.#clone);
            /** @type {any} */ (host).clone = host;
        }
        this.#clone = null;
    }

    /**
     * Called once by assignFeatures after the getter is installed on the prototype.
     * Captures the seed element's DOM fragment and stores it as a template on the constructor.
     *
     * @param {Function} ctr - The custom element constructor
     * @param {import('./types/assign-gingerly/types').FeatureConfig} featureConfig
     * @param {string} key - The feature key
     */
    static onAssigned(ctr, featureConfig, key) {
        const seedRef = /** @type {WeakRef<HTMLScriptElement> | undefined} */ (
            /** @type {any} */ (ctr).seedRef
        );
        if (!seedRef) return;
        const scriptEl = seedRef.deref();
        if (!scriptEl) return;

        const parent = scriptEl.parentElement;
        if (!parent) return;

        const template = document.createElement('template');
        /** @type {TemplateSource} */
        let source;

        // Check for shadow root first
        const shadowRoot = parent.shadowRoot;
        if (shadowRoot) {
            source = 'shadow';
            // Clone shadow root contents into the template
            for (const node of Array.from(shadowRoot.childNodes)) {
                template.content.appendChild(node.cloneNode(true));
            }
        } else {
            source = 'light';
            // Clone children excluding the seed script element
            for (const node of Array.from(parent.childNodes)) {
                if (node === scriptEl) continue;
                template.content.appendChild(node.cloneNode(true));
            }
        }

        /** @type {any} */ (ctr)[templateSym] = template;
        /** @type {any} */ (ctr)[templateSourceSym] = source;
    }
}

export { TemplateMaker, templateSym, templateSourceSym };
