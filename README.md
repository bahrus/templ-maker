# templ-maker (Template Maker)

One nice feature that the [mount-observer](https://github.com/bahrus/mount-observer) polyfill provides is a way to define a custom element declaratively via [custom element definition (cede) scripts](https://github.com/bahrus/mount-observer#custom-element-definition-cede-scripts):

```html
<hello-world>
    <template shadowrootmode=open>
        Hi, there
    </template>
    <script type="cede" data-extends="el-maker"></script>
</hello>

...

<hello-world></hello-world>
```

This relies on a custom element library (in this case, el-maker) that on-the-fly knows what to do in order to turn the DOM fragment it sits inside into a custom element.  

And in order to do that, el-maker needs access to the DOM fragment surrounding it.  mount-observer's cede script makes sure it is.  It passes the script element to the constructor of the newly minted custom element:

```Javascript
NewCtr.seedRef = new WeakRef(scriptEl);
```

What this custom element feature does is pull in the HTML DOM Fragment of the parent element -- first checking for a shadow root, and if that isn't there, from a clone of the children not including the seed script element.  It takes careful note of which of the two scenarios (ShadowDOM/notShadowDOM). It does this in the onAssigned static method of the feature.  It stores the template in the custom element constructor based off of a symbol key

The TemplMaker feature class instance clones the template and by default sets the host element's clone property to the clone.

It also provides an append method, that appends the clone to the shadowRoot, or to the element itself, depending on what scenario was noted for the initial "seed" live DOM fragment.  

## Replacing the clone

It's convenient for the custom element to be thinking, conceptually, "update the clone".  This is in fact what it does as long as the clone property of the custom element really is the clone that templ-maker produced.  But, unfortunately, once that clone has been appended to the shadow root or to the light children, continuing to "update the clone" stops working.  So to keep the concept of "updating the clone" going, the append method should replace the clone property of the hostElement with either the ShadowRoot, or the hostElement itself, depending on where the clone was appended to.



1. Install git
2. Fork/clone this repo
3. Install node.js
4. Open command window to folder where you cloned this repo
5. > git submodule add https://github.com/bahrus/types.git types
6. > git submodule update --init --recursive
7. > npm install
8. > npm run serve
9. Open http://localhost:8000/ in a modern browser