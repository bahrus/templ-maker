# Support For Adopted Stylesheets In Cede Script

## Human Ask

How can we support declarative adopted stylesheets for custom elements that make use of TemplateMaker feature.

## Suggestions

### The Problem

When a cede script defines a custom element with a shadow root, any `<style>` elements inside the declarative shadow root template get cloned into every instance's shadow DOM. This works, but adopted stylesheets are more performant — they share a single parsed CSSStyleSheet across all instances rather than re-parsing CSS for each clone.

The challenge: there's no declarative way to express adopted stylesheets in HTML today. We need a convention that TemplateMaker can recognize during `onAssigned` and convert into adopted stylesheets at the class level.

### Proposed Approach: `<style adoptedstylesheet>` Convention

Use a custom attribute on `<style>` elements inside the seed's shadow root to signal that they should be lifted into adopted stylesheets rather than cloned per-instance:

```html
<hello-world>
    <template shadowrootmode=open>
        <style adoptedstylesheet>
            :host { display: block; color: blue; }
            .greeting { font-weight: bold; }
        </style>
        <p class="greeting">Hi, there</p>
    </template>
    <script type="cede" data-extends="el-maker"></script>
</hello-world>
```

### How It Would Work

1. **During `onAssigned`** — when TemplateMaker captures the seed DOM, it scans for `<style adoptedstylesheet>` elements in the shadow root content.

2. **Extract and construct** — for each matched style element, create a `CSSStyleSheet` via `new CSSStyleSheet()` and call `sheet.replaceSync(styleEl.textContent)`. Store the array of sheets on the constructor via a symbol key (e.g., `Symbol.for('templ-maker:adoptedStylesheets')`).

3. **Remove from template** — strip the `<style adoptedstylesheet>` elements from the stored template content so they don't get cloned per-instance.

4. **During `append`** — when the clone is appended to the shadow root, also assign the stored stylesheets: `shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, ...ctr[adoptedSheetsSym]]`.

### Implementation Sketch

```javascript
const adoptedSheetsSym = Symbol.for('templ-maker:adoptedStylesheets');

// In onAssigned, after capturing the shadow root content:
if (source === 'shadow') {
    const styleEls = template.content.querySelectorAll('style[adoptedstylesheet]');
    if (styleEls.length > 0) {
        const sheets = [];
        for (const styleEl of styleEls) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(styleEl.textContent);
            sheets.push(sheet);
            styleEl.remove(); // Remove from template so it's not cloned
        }
        ctr[adoptedSheetsSym] = sheets;
    }
}

// In append, when source === 'shadow':
const sheets = ctr[adoptedSheetsSym];
if (sheets) {
    shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, ...sheets];
}
```

### Light DOM Consideration

For the light DOM scenario (`source === 'light'`), adopted stylesheets don't apply directly to the element — they apply to a `Document` or `ShadowRoot`. Two options:

1. **Ignore for light DOM** — only support adopted stylesheets when a shadow root is present. This is the simplest and most correct approach since adopted stylesheets are scoped to shadow roots anyway.

2. **Adopt into the document** — call `document.adoptedStyleSheets = [...]` for light DOM elements. This is risky because it's global and could conflict. Not recommended unless the styles are truly global (e.g., a design token sheet).

Recommendation: only support `<style adoptedstylesheet>` in the shadow DOM path.

### Multiple Style Elements

Multiple `<style adoptedstylesheet>` elements should each become their own `CSSStyleSheet`. This allows component authors to separate concerns (e.g., layout vs. theming) and lets consumers potentially override individual sheets later via `shadowRoot.adoptedStyleSheets` manipulation.

### Mixing Adopted and Inline Styles

Regular `<style>` elements (without the `adoptedstylesheet` attribute) should continue to be cloned normally. This gives authors flexibility — use adopted stylesheets for shared/static CSS and inline styles for instance-specific or dynamic CSS.

### External Stylesheet Support (Future)

A natural extension would be supporting `<link rel="stylesheet" adoptedstylesheet href="...">` to load external CSS as adopted stylesheets. This would require async handling in `onAssigned` (which is already supported since `assignFeatures` awaits the return value). The fetch + `sheet.replace(text)` pattern would work here.

---
## Human Response I

What dou think about using a shorter, easier to remember attribute like "adopt"?

### AI Response

Agreed — `adopt` is better. It's concise, reads naturally (`<style adopt>`), and the meaning is unambiguous in the context of shadow DOM. The longer `adoptedstylesheet` is redundant since it's already on a `<style>` element. Updated approach uses `adopt` throughout:

```html
<style adopt>
    :host { display: block; color: blue; }
</style>
```

Selector becomes: `style[adopt]`