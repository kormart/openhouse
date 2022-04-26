
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Hoverable.svelte generated by Svelte v3.47.0 */

    const file$2 = "src/Hoverable.svelte";
    const get_default_slot_changes$1 = dirty => ({ hovering: dirty & /*hovering*/ 1 });
    const get_default_slot_context$1 = ctx => ({ hovering: /*hovering*/ ctx[0] });

    function create_fragment$2(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], get_default_slot_context$1);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$2, 13, 0, 137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mouseenter", /*enter*/ ctx[1], false, false, false),
    					listen_dev(div, "mouseleave", /*leave*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, hovering*/ 9)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, get_default_slot_changes$1),
    						get_default_slot_context$1
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hoverable', slots, ['default']);
    	let hovering;
    	let selected;

    	function enter() {
    		$$invalidate(0, hovering = true);
    	}

    	function leave() {
    		$$invalidate(0, hovering = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hoverable> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ hovering, selected, enter, leave });

    	$$self.$inject_state = $$props => {
    		if ('hovering' in $$props) $$invalidate(0, hovering = $$props.hovering);
    		if ('selected' in $$props) selected = $$props.selected;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hovering, enter, leave, $$scope, slots];
    }

    class Hoverable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hoverable",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Hoverable2.svelte generated by Svelte v3.47.0 */

    const file$1 = "src/Hoverable2.svelte";
    const get_default_slot_changes = dirty => ({ hovering: dirty & /*hovering*/ 1 });
    const get_default_slot_context = ctx => ({ hovering: /*hovering*/ ctx[0] });

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], get_default_slot_context);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$1, 14, 0, 150);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mouseenter", /*enter*/ ctx[1], false, false, false),
    					listen_dev(div, "mouseleave", /*leave*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, hovering*/ 9)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hoverable2', slots, ['default']);
    	let hovering;
    	let selected;

    	function enter() {
    		$$invalidate(0, hovering = true);
    	}

    	function leave() {
    		$$invalidate(0, hovering = selected);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hoverable2> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ hovering, selected, enter, leave });

    	$$self.$inject_state = $$props => {
    		if ('hovering' in $$props) $$invalidate(0, hovering = $$props.hovering);
    		if ('selected' in $$props) selected = $$props.selected;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [hovering, enter, leave, $$scope, slots];
    }

    class Hoverable2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hoverable2",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var data = {
        sections: [
            {title: "keynotes", text: "8.30-9.30, 4 x 15 mins, one track session", link: "common_teams_link"},
            {title: "presentations", text: "9.30-11.00, 10 x 6 min, one track session", link: "common_teams_link"},
            {title: "posters", text: "11.00-13.00, 50+ posters, parallel track session", link: "common_teams_link"}
        ],
        tags: [
            "ai", 
            "data", 
            "cloud", 
            "edge", 
            "datascience", 
            "4G/5G/6G",
            "IoT",
        ],
        keynotes: [
            {title: "Welcome and Introduction", text: "RISE Computer Science", link: "common_teams_link"},
            {title: "Ali Ghodsi, CEO Databricks", text: "Fireside chat", link: "common_teams_link"},
            {title: "Jim Dowling, CEO Hopsworks", text: "Fireside chat", link: "common_teams_link"},
            {title: "Staffan Truvé, CTO Recorded Future", text: "Presentation", link: "common_teams_link"}
        ],
        presentations: [
            {title: "AI NLP - Is bigger always better?", presenter: "Joakim Nivre", text: "lorem", link: "common_teams_link"},
            {title: "Cyber Security - Are you ready for the next attack?", presenter: "Shahid Raza", text: "lorem", link: "common_teams_link"},
            {title: "DataCenter Systems - Why do we need datacenters when we have the cloud?", presenter: "Tor Björn Minde", text: "lorem", link: "common_teams_link"},
            {title: "AI & Earth Observation - What on earth are you looking for?", presenter: "Emil Svanberg", text: "lorem", link: "common_teams_link"},
            {title: "AI Platforms and Infrastructure - Can I mix my AI, HPC, and Quantum?", presenter: "Martin Körling", text: "lorem", link: "common_teams_link"},
            {title: "Industrial Data Analysis - Is AI causing you problems?", presenter: "Sepideh", text: "lorem", link: "common_teams_link"},
            {title: "Low power IoT - Are the batteries included?", presenter: "Joakim Eriksson", text: "lorem", link: "common_teams_link"},
        ],
        posters: [
            {title: "AI@Edge – AI for network automation", presenter: "N.N.", text: "The introduction of AI and Machine Learning (ML) technologies in the cloud-network convergence process will be crucial and help operators achieve a higher level of automation and increase network performance.  The aim of the AI@EDGE project is to build a platform and the tools that enable secure and automated roll-out of large-scale edge and cloud compute infrastructures, with close to zero-touch of the underlying heterogeneous MEC resources (network, storage, and compute resources).", tags: ["data", "ai", "edge"]},
            {title: "Jamming Detection with JamSense", presenter: "N.N.", text: "Low-power wireless networks transmit at low output power and are hence susceptible to cross-technology interference and jamming attacks. These may cause packet loss which may waste scarce energy resources by requiring the retransmission of packets. We present JamSense, a tool that is able to identify jamming attacks with high accuracy while not classifying Bluetooth or WiFi interference as jamming attacks.", tags: ["IoT","data"]},
            {title: "post3", presenter: "N.N.", text: "lorem-post3", tags: ["data"]},
            {title: "post4", presenter: "N.N.", text: "lorem-post4", tags: ["ai"]},
            {title: "post5", presenter: "N.N.", text: "lorem-post5", tags: ["ai"]},
            {title: "post6", presenter: "N.N.", text: "lorem-post6", tags: ["ai"]},
            {title: "post7", presenter: "N.N.", text: "lorem-post7", tags: ["ai"]},
            {title: "post8", presenter: "N.N.", text: "lorem-post8", tags: ["ai","data"]},
            {title: "post9", presenter: "N.N.", text: "lorem-post9", tags: ["ai","data"]},
            {title: "post10", presenter: "N.N.", text: "lorem-post10", tags: ["ai","data"]},
            {title: "post11", presenter: "N.N.", text: "lorem-post11", tags: ["ai","data"]},
            {title: "post12", presenter: "N.N.", text: "lorem-post12", tags: ["ai","data"]},
            {title: "post13", presenter: "N.N.", text: "lorem-post13", tags: ["ai","data"]}
        ]

    };

    /* src/App.svelte generated by Svelte v3.47.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (36:4) <Hoverable let:hovering={active} >
    function create_default_slot_3(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*section*/ ctx[21].title + "";
    	let t0;
    	let t1;
    	let br0;
    	let t2;
    	let small0;
    	let t3_value = /*section*/ ctx[21].text + "";
    	let t3;
    	let t4;
    	let br1;
    	let t5;
    	let small1;
    	let a;
    	let t6;
    	let t7;
    	let br2;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*section*/ ctx[21], /*index*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" →");
    			br0 = element("br");
    			t2 = space();
    			small0 = element("small");
    			t3 = text(t3_value);
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			small1 = element("small");
    			a = element("a");
    			t6 = text("Teams link");
    			t7 = space();
    			br2 = element("br");
    			t8 = space();
    			set_style(b, "font-size", "20px");
    			set_style(b, "text-transform", "uppercase");
    			add_location(b, file, 38, 7, 886);
    			add_location(br0, file, 38, 86, 965);
    			add_location(small0, file, 39, 7, 977);
    			add_location(br1, file, 39, 37, 1007);
    			attr_dev(a, "href", /*section*/ ctx[21].link);
    			add_location(a, file, 40, 14, 1026);
    			add_location(small1, file, 40, 7, 1019);
    			add_location(br2, file, 40, 63, 1075);
    			add_location(p, file, 37, 6, 875);
    			attr_dev(div, "class", "card svelte-19pn9q3");
    			toggle_class(div, "active", /*active*/ ctx[14] || /*c1i*/ ctx[2] == /*index*/ ctx[13]);
    			add_location(div, file, 36, 5, 724);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, b);
    			append_dev(b, t0);
    			append_dev(b, t1);
    			append_dev(p, br0);
    			append_dev(p, t2);
    			append_dev(p, small0);
    			append_dev(small0, t3);
    			append_dev(p, t4);
    			append_dev(p, br1);
    			append_dev(p, t5);
    			append_dev(p, small1);
    			append_dev(small1, a);
    			append_dev(a, t6);
    			append_dev(p, t7);
    			append_dev(p, br2);
    			insert_dev(target, t8, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*active, c1i*/ 16388) {
    				toggle_class(div, "active", /*active*/ ctx[14] || /*c1i*/ ctx[2] == /*index*/ ctx[13]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t8);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(36:4) <Hoverable let:hovering={active} >",
    		ctx
    	});

    	return block;
    }

    // (35:2) {#each data.sections as section, index}
    function create_each_block_4(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_3,
    						({ hovering: active }) => ({ 14: active }),
    						({ hovering: active }) => active ? 16384 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hoverable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hoverable, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const hoverable_changes = {};

    			if (dirty & /*$$scope, active, c1i, current1, current2, c2i*/ 8405007) {
    				hoverable_changes.$$scope = { dirty, ctx };
    			}

    			hoverable.$set(hoverable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hoverable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hoverable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hoverable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(35:2) {#each data.sections as section, index}",
    		ctx
    	});

    	return block;
    }

    // (48:1) {#if current1 == 'keynotes' }
    function create_if_block_6(ctx) {
    	let div;
    	let current;
    	let each_value_3 = data.keynotes;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "column2 svelte-19pn9q3");
    			add_location(div, file, 48, 1, 1171);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active, c2i, current2, data*/ 16394) {
    				each_value_3 = data.keynotes;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(48:1) {#if current1 == 'keynotes' }",
    		ctx
    	});

    	return block;
    }

    // (51:4) <Hoverable let:hovering={active}>
    function create_default_slot_2(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*keynote*/ ctx[19].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*keynote*/ ctx[19].text + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let a;
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*keynote*/ ctx[19], /*index*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" →");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			small0 = element("small");
    			t4 = text(t4_value);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			small1 = element("small");
    			a = element("a");
    			t7 = text("Teams link");
    			t8 = space();
    			add_location(b, file, 53, 8, 1412);
    			add_location(br0, file, 53, 37, 1441);
    			add_location(small0, file, 54, 7, 1453);
    			add_location(br1, file, 54, 37, 1483);
    			attr_dev(a, "href", /*keynote*/ ctx[19].link);
    			add_location(a, file, 55, 14, 1502);
    			add_location(small1, file, 55, 7, 1495);
    			add_location(p, file, 52, 6, 1401);
    			attr_dev(div, "class", "card svelte-19pn9q3");
    			toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			add_location(div, file, 51, 5, 1278);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, b);
    			append_dev(b, t0);
    			append_dev(b, t1);
    			append_dev(p, t2);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			append_dev(p, small0);
    			append_dev(small0, t4);
    			append_dev(p, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(p, small1);
    			append_dev(small1, a);
    			append_dev(a, t7);
    			insert_dev(target, t8, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*active, c2i*/ 16392) {
    				toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t8);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(51:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (50:2) {#each data.keynotes as keynote, index}
    function create_each_block_3(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_2,
    						({ hovering: active }) => ({ 14: active }),
    						({ hovering: active }) => active ? 16384 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hoverable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hoverable, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const hoverable_changes = {};

    			if (dirty & /*$$scope, active, c2i, current2*/ 8405002) {
    				hoverable_changes.$$scope = { dirty, ctx };
    			}

    			hoverable.$set(hoverable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hoverable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hoverable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hoverable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(50:2) {#each data.keynotes as keynote, index}",
    		ctx
    	});

    	return block;
    }

    // (64:1) {#if current1 == 'presentations' }
    function create_if_block_5(ctx) {
    	let div;
    	let current;
    	let each_value_2 = data.presentations;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "column2 svelte-19pn9q3");
    			add_location(div, file, 64, 1, 1654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active, c2i, current2, data*/ 16394) {
    				each_value_2 = data.presentations;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(64:1) {#if current1 == 'presentations' }",
    		ctx
    	});

    	return block;
    }

    // (67:4) <Hoverable let:hovering={active}>
    function create_default_slot_1(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*pres*/ ctx[17].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*pres*/ ctx[17].presenter + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let a;
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[8](/*pres*/ ctx[17], /*index*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" →");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			small0 = element("small");
    			t4 = text(t4_value);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			small1 = element("small");
    			a = element("a");
    			t7 = text("Teams link");
    			t8 = space();
    			add_location(b, file, 68, 9, 1886);
    			add_location(br0, file, 68, 35, 1912);
    			add_location(small0, file, 69, 7, 1924);
    			add_location(br1, file, 69, 39, 1956);
    			attr_dev(a, "href", /*pres*/ ctx[17].link);
    			add_location(a, file, 70, 14, 1975);
    			add_location(small1, file, 70, 7, 1968);
    			add_location(p, file, 68, 6, 1883);
    			attr_dev(div, "class", "card svelte-19pn9q3");
    			toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			add_location(div, file, 67, 5, 1763);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, b);
    			append_dev(b, t0);
    			append_dev(b, t1);
    			append_dev(p, t2);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			append_dev(p, small0);
    			append_dev(small0, t4);
    			append_dev(p, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(p, small1);
    			append_dev(small1, a);
    			append_dev(a, t7);
    			insert_dev(target, t8, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*active, c2i*/ 16392) {
    				toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t8);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(67:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (66:2) {#each data.presentations as pres, index}
    function create_each_block_2(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_1,
    						({ hovering: active }) => ({ 14: active }),
    						({ hovering: active }) => active ? 16384 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hoverable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hoverable, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const hoverable_changes = {};

    			if (dirty & /*$$scope, active, c2i, current2*/ 8405002) {
    				hoverable_changes.$$scope = { dirty, ctx };
    			}

    			hoverable.$set(hoverable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hoverable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hoverable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hoverable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(66:2) {#each data.presentations as pres, index}",
    		ctx
    	});

    	return block;
    }

    // (79:1) {#if current1 == 'posters' }
    function create_if_block_3(ctx) {
    	let div;
    	let span;
    	let small0;
    	let b;
    	let t1;
    	let t2;
    	let small1;
    	let t5;
    	let hr;
    	let t6;
    	let current;
    	let each_value_1 = data.tags;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = data.posters;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			small0 = element("small");
    			b = element("b");
    			b.textContent = "Tag Selector:";
    			t1 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t2 = space();
    			small1 = element("small");
    			small1.textContent = `Diagnostic: ${/*tagSelection*/ ctx[5]}`;
    			t5 = space();
    			hr = element("hr");
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(b, file, 81, 10, 2173);
    			add_location(small0, file, 81, 3, 2166);
    			attr_dev(span, "class", "tags svelte-19pn9q3");
    			add_location(span, file, 80, 2, 2143);
    			add_location(small1, file, 88, 2, 2467);
    			set_style(hr, "color", "black");
    			add_location(hr, file, 89, 2, 2511);
    			attr_dev(div, "class", "column2 svelte-19pn9q3");
    			add_location(div, file, 79, 1, 2119);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, small0);
    			append_dev(small0, b);
    			append_dev(span, t1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(span, null);
    			}

    			append_dev(div, t2);
    			append_dev(div, small1);
    			append_dev(div, t5);
    			append_dev(div, hr);
    			append_dev(div, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active, tagSelection, data*/ 16416) {
    				each_value_1 = data.tags;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(span, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*active, c2i, current2, data, selectedTag*/ 16410) {
    				each_value = data.posters;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(79:1) {#if current1 == 'posters' }",
    		ctx
    	});

    	return block;
    }

    // (83:3) {#each data.tags as tag, index}
    function create_each_block_1(ctx) {
    	let button;
    	let small;
    	let t0_value = /*tag*/ ctx[15] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[9](/*tag*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			small = element("small");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(small, file, 84, 98, 2384);
    			attr_dev(button, "class", "svelte-19pn9q3");
    			toggle_class(button, "active", /*active*/ ctx[14]);
    			add_location(button, file, 84, 5, 2291);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, small);
    			append_dev(small, t0);
    			insert_dev(target, t1, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*active*/ 16384) {
    				toggle_class(button, "active", /*active*/ ctx[14]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(83:3) {#each data.tags as tag, index}",
    		ctx
    	});

    	return block;
    }

    // (92:3) {#if poster.tags.includes(selectedTag) }
    function create_if_block_4(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot,
    						({ hovering: active }) => ({ 14: active }),
    						({ hovering: active }) => active ? 16384 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hoverable.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(hoverable, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const hoverable_changes = {};

    			if (dirty & /*$$scope, active, c2i, current2*/ 8405002) {
    				hoverable_changes.$$scope = { dirty, ctx };
    			}

    			hoverable.$set(hoverable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hoverable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hoverable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hoverable, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(92:3) {#if poster.tags.includes(selectedTag) }",
    		ctx
    	});

    	return block;
    }

    // (93:4) <Hoverable let:hovering={active}>
    function create_default_slot(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*poster*/ ctx[11].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*poster*/ ctx[11].presenter + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let t7;
    	let t8_value = /*poster*/ ctx[11].tags + "";
    	let t8;
    	let t9;
    	let br2;
    	let t10;
    	let small2;
    	let a;
    	let t11;
    	let t12;
    	let mounted;
    	let dispose;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[10](/*poster*/ ctx[11], /*index*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" →");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			small0 = element("small");
    			t4 = text(t4_value);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			small1 = element("small");
    			t7 = text("Tags: ");
    			t8 = text(t8_value);
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			small2 = element("small");
    			a = element("a");
    			t11 = text("Teams link");
    			t12 = space();
    			add_location(b, file, 95, 7, 2798);
    			add_location(br0, file, 95, 35, 2826);
    			add_location(small0, file, 96, 7, 2838);
    			add_location(br1, file, 96, 41, 2872);
    			add_location(small1, file, 97, 7, 2884);
    			add_location(br2, file, 97, 42, 2919);
    			attr_dev(a, "href", /*poster*/ ctx[11].link);
    			add_location(a, file, 98, 14, 2938);
    			add_location(small2, file, 98, 7, 2931);
    			add_location(p, file, 94, 6, 2787);
    			attr_dev(div, "class", "card svelte-19pn9q3");
    			toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			add_location(div, file, 93, 5, 2665);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, b);
    			append_dev(b, t0);
    			append_dev(b, t1);
    			append_dev(p, t2);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			append_dev(p, small0);
    			append_dev(small0, t4);
    			append_dev(p, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(p, small1);
    			append_dev(small1, t7);
    			append_dev(small1, t8);
    			append_dev(p, t9);
    			append_dev(p, br2);
    			append_dev(p, t10);
    			append_dev(p, small2);
    			append_dev(small2, a);
    			append_dev(a, t11);
    			insert_dev(target, t12, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler_4, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*active, c2i*/ 16392) {
    				toggle_class(div, "active", /*active*/ ctx[14] || /*c2i*/ ctx[3] == /*index*/ ctx[13]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t12);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(93:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (91:2) {#each data.posters as poster, index}
    function create_each_block(ctx) {
    	let show_if = /*poster*/ ctx[11].tags.includes(/*selectedTag*/ ctx[4]);
    	let if_block_anchor;
    	let current;
    	let if_block = show_if && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (show_if) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(91:2) {#each data.posters as poster, index}",
    		ctx
    	});

    	return block;
    }

    // (108:1) {#if current2 != 'foo' }
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let b;
    	let t0_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].title + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let t3;
    	let t4;
    	let small0;
    	let a;
    	let t5;
    	let a_href_value;
    	let t6;
    	let small1;
    	let t7_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].text + "";
    	let t7;
    	let if_block0 = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].presenter && create_if_block_2(ctx);
    	let if_block1 = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].tags && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			small0 = element("small");
    			a = element("a");
    			t5 = text("Teams link");
    			t6 = space();
    			small1 = element("small");
    			t7 = text(t7_value);
    			add_location(b, file, 110, 6, 3138);
    			add_location(br, file, 110, 41, 3173);
    			attr_dev(a, "href", a_href_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].link);
    			add_location(a, file, 117, 11, 3402);
    			add_location(small0, file, 117, 4, 3395);
    			add_location(p, file, 110, 3, 3135);
    			add_location(small1, file, 119, 3, 3474);
    			attr_dev(div0, "class", "card svelte-19pn9q3");
    			add_location(div0, file, 109, 2, 3112);
    			attr_dev(div1, "class", "column3 svelte-19pn9q3");
    			add_location(div1, file, 108, 1, 3088);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, b);
    			append_dev(b, t0);
    			append_dev(p, t1);
    			append_dev(p, br);
    			append_dev(p, t2);
    			if (if_block0) if_block0.m(p, null);
    			append_dev(p, t3);
    			if (if_block1) if_block1.m(p, null);
    			append_dev(p, t4);
    			append_dev(p, small0);
    			append_dev(small0, a);
    			append_dev(a, t5);
    			append_dev(div0, t6);
    			append_dev(div0, small1);
    			append_dev(small1, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current1, c2i*/ 9 && t0_value !== (t0_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].title + "")) set_data_dev(t0, t0_value);

    			if (data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].presenter) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(p, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].tags) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(p, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*current1, c2i*/ 9 && a_href_value !== (a_href_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*current1, c2i*/ 9 && t7_value !== (t7_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].text + "")) set_data_dev(t7, t7_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(108:1) {#if current2 != 'foo' }",
    		ctx
    	});

    	return block;
    }

    // (112:4) {#if data[current1][c2i].presenter}
    function create_if_block_2(ctx) {
    	let small;
    	let t0_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].presenter + "";
    	let t0;
    	let t1;
    	let br;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			add_location(small, file, 112, 5, 3224);
    			add_location(br, file, 112, 52, 3271);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current1, c2i*/ 9 && t0_value !== (t0_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].presenter + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(112:4) {#if data[current1][c2i].presenter}",
    		ctx
    	});

    	return block;
    }

    // (115:4) {#if data[current1][c2i].tags}
    function create_if_block_1(ctx) {
    	let small;
    	let t0;
    	let t1_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].tags + "";
    	let t1;
    	let t2;
    	let br;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t0 = text("Tags: ");
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			add_location(small, file, 115, 5, 3328);
    			add_location(br, file, 115, 53, 3376);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			append_dev(small, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current1, c2i*/ 9 && t1_value !== (t1_value = data[/*current1*/ ctx[0]][/*c2i*/ ctx[3]].tags + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(115:4) {#if data[current1][c2i].tags}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let a3;
    	let t7;
    	let span;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let div1;
    	let h1;
    	let t16;
    	let br;
    	let t17;
    	let t18;
    	let div3;
    	let div2;
    	let t19;
    	let t20;
    	let t21;
    	let t22;
    	let current;
    	let each_value_4 = data.sections;
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*current1*/ ctx[0] == 'keynotes' && create_if_block_6(ctx);
    	let if_block1 = /*current1*/ ctx[0] == 'presentations' && create_if_block_5(ctx);
    	let if_block2 = /*current1*/ ctx[0] == 'posters' && create_if_block_3(ctx);
    	let if_block3 = /*current2*/ ctx[1] != 'foo' && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "News";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "Contact";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "About";
    			t7 = space();
    			span = element("span");
    			t8 = text(/*current1*/ ctx[0]);
    			t9 = text(", ");
    			t10 = text(/*c1i*/ ctx[2]);
    			t11 = text(", ");
    			t12 = text(/*current2*/ ctx[1]);
    			t13 = text(", ");
    			t14 = text(/*c2i*/ ctx[3]);
    			t15 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t16 = text("RISE Computer Science & AI ");
    			br = element("br");
    			t17 = text("\n\t\tOpen House, May 10, 2022");
    			t18 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t19 = space();
    			if (if_block0) if_block0.c();
    			t20 = space();
    			if (if_block1) if_block1.c();
    			t21 = space();
    			if (if_block2) if_block2.c();
    			t22 = space();
    			if (if_block3) if_block3.c();
    			attr_dev(a0, "class", "active svelte-19pn9q3");
    			attr_dev(a0, "href", "#home");
    			add_location(a0, file, 17, 1, 297);
    			attr_dev(a1, "href", "#news");
    			attr_dev(a1, "class", "svelte-19pn9q3");
    			add_location(a1, file, 18, 1, 338);
    			attr_dev(a2, "href", "#contact");
    			attr_dev(a2, "class", "svelte-19pn9q3");
    			add_location(a2, file, 19, 1, 364);
    			attr_dev(a3, "href", "#about");
    			attr_dev(a3, "class", "svelte-19pn9q3");
    			add_location(a3, file, 20, 1, 396);
    			add_location(span, file, 21, 1, 424);
    			attr_dev(div0, "class", "topnav svelte-19pn9q3");
    			add_location(div0, file, 16, 0, 275);
    			add_location(br, file, 26, 29, 537);
    			add_location(h1, file, 25, 1, 503);
    			attr_dev(div1, "class", "jumbo svelte-19pn9q3");
    			add_location(div1, file, 24, 0, 482);
    			attr_dev(div2, "class", "column1 svelte-19pn9q3");
    			add_location(div2, file, 33, 1, 615);
    			attr_dev(div3, "class", "grid-container svelte-19pn9q3");
    			add_location(div3, file, 31, 0, 584);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, a0);
    			append_dev(div0, t1);
    			append_dev(div0, a1);
    			append_dev(div0, t3);
    			append_dev(div0, a2);
    			append_dev(div0, t5);
    			append_dev(div0, a3);
    			append_dev(div0, t7);
    			append_dev(div0, span);
    			append_dev(span, t8);
    			append_dev(span, t9);
    			append_dev(span, t10);
    			append_dev(span, t11);
    			append_dev(span, t12);
    			append_dev(span, t13);
    			append_dev(span, t14);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h1);
    			append_dev(h1, t16);
    			append_dev(h1, br);
    			append_dev(h1, t17);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div3, t19);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t20);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t21);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t22);
    			if (if_block3) if_block3.m(div3, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*current1*/ 1) set_data_dev(t8, /*current1*/ ctx[0]);
    			if (!current || dirty & /*c1i*/ 4) set_data_dev(t10, /*c1i*/ ctx[2]);
    			if (!current || dirty & /*current2*/ 2) set_data_dev(t12, /*current2*/ ctx[1]);
    			if (!current || dirty & /*c2i*/ 8) set_data_dev(t14, /*c2i*/ ctx[3]);

    			if (dirty & /*active, c1i, current1, data, current2, c2i*/ 16399) {
    				each_value_4 = data.sections;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_4.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*current1*/ ctx[0] == 'keynotes') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*current1*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div3, t20);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*current1*/ ctx[0] == 'presentations') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*current1*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, t21);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*current1*/ ctx[0] == 'posters') {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*current1*/ 1) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div3, t22);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*current2*/ ctx[1] != 'foo') {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					if_block3.m(div3, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let current1 = 'keynotes';
    	let current2 = 'foo';
    	let c1i = 0;
    	let c2i = -1;
    	let selectedTag = "data";
    	let tagSelection = [];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (section, index) => {
    		$$invalidate(0, current1 = section.title);
    		$$invalidate(2, c1i = index);
    		$$invalidate(1, current2 = 'foo');
    		$$invalidate(3, c2i = -1);
    	};

    	const click_handler_1 = (keynote, index) => {
    		$$invalidate(1, current2 = keynote.title);
    		$$invalidate(3, c2i = index);
    	};

    	const click_handler_2 = (pres, index) => {
    		$$invalidate(1, current2 = pres.title);
    		$$invalidate(3, c2i = index);
    	};

    	const click_handler_3 = tag => {
    		tagSelection.push(tag);
    	};

    	const click_handler_4 = (poster, index) => {
    		$$invalidate(1, current2 = poster.title);
    		$$invalidate(3, c2i = index);
    	};

    	$$self.$capture_state = () => ({
    		Hoverable,
    		Hoverable2,
    		data,
    		current1,
    		current2,
    		c1i,
    		c2i,
    		selectedTag,
    		tagSelection
    	});

    	$$self.$inject_state = $$props => {
    		if ('current1' in $$props) $$invalidate(0, current1 = $$props.current1);
    		if ('current2' in $$props) $$invalidate(1, current2 = $$props.current2);
    		if ('c1i' in $$props) $$invalidate(2, c1i = $$props.c1i);
    		if ('c2i' in $$props) $$invalidate(3, c2i = $$props.c2i);
    		if ('selectedTag' in $$props) $$invalidate(4, selectedTag = $$props.selectedTag);
    		if ('tagSelection' in $$props) $$invalidate(5, tagSelection = $$props.tagSelection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		current1,
    		current2,
    		c1i,
    		c2i,
    		selectedTag,
    		tagSelection,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
