
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
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

    const file$3 = "src/Hoverable.svelte";
    const get_default_slot_changes = dirty => ({ hovering: dirty & /*hovering*/ 1 });
    const get_default_slot_context = ctx => ({ hovering: /*hovering*/ ctx[0] });

    function create_fragment$3(ctx) {
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
    			add_location(div, file$3, 13, 0, 137);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hoverable",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /* src/ButtonGroup.svelte generated by Svelte v3.47.0 */
    const file$2 = "src/ButtonGroup.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$2, 31, 0, 634);
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
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
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

    const BUTTON_GROUP = {};

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ButtonGroup', slots, ['default']);
    	let { multiple = false } = $$props;
    	let { mandatory = false } = $$props;
    	let { value = [] } = $$props;
    	const values = writable(value);

    	setContext(BUTTON_GROUP, {
    		selectButton: val => {
    			if (value.includes(val)) {
    				if (!(mandatory && value.length === 1)) {
    					value.splice(value.indexOf(val), 1);
    					$$invalidate(0, value);
    				}
    			} else if (multiple) {
    				$$invalidate(0, value = [...value, val]);
    			} else {
    				$$invalidate(0, value = [val]);
    			}
    		},
    		values
    	});

    	const writable_props = ['multiple', 'mandatory', 'value'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ButtonGroup> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('multiple' in $$props) $$invalidate(1, multiple = $$props.multiple);
    		if ('mandatory' in $$props) $$invalidate(2, mandatory = $$props.mandatory);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		BUTTON_GROUP,
    		setContext,
    		onDestroy,
    		writable,
    		multiple,
    		mandatory,
    		value,
    		values
    	});

    	$$self.$inject_state = $$props => {
    		if ('multiple' in $$props) $$invalidate(1, multiple = $$props.multiple);
    		if ('mandatory' in $$props) $$invalidate(2, mandatory = $$props.mandatory);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*value*/ 1) {
    			values.set(value);
    		}
    	};

    	return [value, multiple, mandatory, $$scope, slots];
    }

    class ButtonGroup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { multiple: 1, mandatory: 2, value: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ButtonGroup",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get multiple() {
    		throw new Error("<ButtonGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set multiple(value) {
    		throw new Error("<ButtonGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mandatory() {
    		throw new Error("<ButtonGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mandatory(value) {
    		throw new Error("<ButtonGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<ButtonGroup>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<ButtonGroup>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Button.svelte generated by Svelte v3.47.0 */
    const file$1 = "src/Button.svelte";

    function create_fragment$1(ctx) {
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button, "class", "svelte-w2abx1");
    			toggle_class(button, "active", /*active*/ ctx[0]);
    			add_location(button, file$1, 17, 0, 335);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (default_slot) {
    				default_slot.m(button, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[5],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[5])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null),
    						null
    					);
    				}
    			}

    			if (dirty & /*active*/ 1) {
    				toggle_class(button, "active", /*active*/ ctx[0]);
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
    			if (detaching) detach_dev(button);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
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
    	let $values;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, ['default']);
    	const { selectButton, values } = getContext(BUTTON_GROUP);
    	validate_store(values, 'values');
    	component_subscribe($$self, values, value => $$invalidate(4, $values = value));
    	let { value } = $$props;
    	let { active = true } = $$props;
    	const writable_props = ['value', 'active'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => selectButton(value);

    	$$self.$$set = $$props => {
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    		if ('$$scope' in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		BUTTON_GROUP,
    		selectButton,
    		values,
    		value,
    		active,
    		$values
    	});

    	$$self.$inject_state = $$props => {
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('active' in $$props) $$invalidate(0, active = $$props.active);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$values, value*/ 18) {
    			$$invalidate(0, active = $values.includes(value));
    		}
    	};

    	return [active, value, selectButton, values, $values, $$scope, slots, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { value: 1, active: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*value*/ ctx[1] === undefined && !('value' in props)) {
    			console.warn("<Button> was created without expected prop 'value'");
    		}
    	}

    	get value() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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
            "iot",
            "cybersecurity",
            "software"
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

    var posters = {posters:  [{'title': 'AI@Edge – AI for network automation', 'text': 'The introduction of 5G technologies is a paradigm shift: its high performance in terms of latency, bitrate, and reliability, call for a technological and business convergence between the cloud computing and the telecom worlds. Features like edge computing, network slicing, and better and more flexible radio connectivity can be used to support qualitatively different applications.  Nevertheless, the challenges to be overcome in order to realize this connectivity/computing convergence are still notable. In particular, the increasing number of control and optimization dimensions of the end-to-end 5G infrastructure may result in an overly complex network that operators and vendors may find difficult to operate, manage, and evolve. The introduction of AI and Machine Learning (ML) technologies in the cloud-network convergence process will be crucial and help operators achieve a higher level of automation and increase network performance.  The aim of the AI@EDGE project is to build a platform and the tools that enable secure and automated roll-out of large-scale edge and cloud compute infrastructures, with close to zero-touch of the underlying heterogeneous MEC resources (network, storage, and compute resources).', 'links': 'https://aiatedge.eu/', 'contact': 'Daniel Perez (daniel.perez aaat ri.se), Akhila Rao (akhila.rao aat ri.se).', 'tags': ['ai', 'edge', 'iot', '4G/5G/6G'], 'teams': 'common_team_link'}, {'title': 'Jamming Detection with JamSense', 'text': 'Low-power wireless networks transmit at low output power and are hence susceptible to cross-technology interference and jamming attacks. These may cause packet loss which may waste scarce energy resources by requiring the retransmission of packets. We present JamSense, a tool that is able to identify jamming attacks with high accuracy while not classifying Bluetooth or WiFi interference as jamming attacks.', 'links': 'https://www.youtube.com/watch?v=BWODgRWLg8U&t=2s&ab_channel=STACK', 'contact': 'Thiemo Voigt <thiemo.voigt aat ri.se>', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'Data trace generation with Multi-Trace', 'text': 'Wireless, low-power, multi-hop networks are exposed to numerous attacks also due to their resource constraints. While there has been a lot of work on intrusion detection systems for such networks, most of these studies have considered only a few topologies, scenarios, and attacks. One of the reasons for this shortcoming is the lack of sufficient data traces required to train many machine learning algorithms. In contrast to other wireless networks, multi-hop networks do not contain one entity that can capture all the traffic, making it more challenging to acquire such traces. We present Multi-Trace, an extension of the Cooja simulator with multi-level tracing facilities that enable data logging at different levels while maintaining a global time.', 'links': '', 'contact': 'Niclas Finne <niclas.finne aat ri.se>', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'ZeroIoT', 'text': 'ZeroIoT enables the battery-free internet of things by advancing and combining backscatter communications and energy-driven intermittent computing. ZeroIoT targets two application domains: In healthcare, implanted devices will improve the diagnosis of Sarcopenia and Osteopenia and the monitoring of prosthetic implants. In civil engineering, we will provide novel means to perform remote displacement monitoring for embankment dams.', 'links': '', 'contact': 'Thiemo Voigt <thiemo.voigt aat ri.se>, Carlos Penichet <carlos.penichet aat ri.se>', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'The Digital Futures Drone Arena', 'text': 'The Digital Futures Drone Arena is a platform where players in the digital transformation and society join in a conversation about the role of mobile robotics, autonomous systems, machine learning, and human-computer interaction. The platform takes the form of a novel aerial drone testbed, where drone competitions take place to explore the unfolding relationships between humans and drones. The inaugural competition is scheduled June 15-17, 2022 and asks participating teams to fly drones through an obstacle course in the shortest time.', 'links': 'https://www.digitalfutures.kth.se/research/demonstrator-projects/digital-futures-drone-arena/, http://www.droneareana.info', 'contact': 'Luca Mottola <luca.mottola aat ri.se>', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'Securing IoT Systems through Stateful Fuzz Testing (poster)', 'text': 'Constrained IoT operating systems comprise a plethora of protocol implementations that can be targeted by attackers. To detect security vulnerabilities, IoT developers employ advanced fuzz testing tools, but these tools fail to reach code that is dependent on protocol states. We propose a method to generate such states in a systematic way, and thereby improve the efficacy of fuzz testing.', 'links': 'https://assist-project.github.io/', 'contact': 'Nicolas Tsiftes <nicolas.tsiftes aat ri.se>', 'tags': ['iot', 'cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Improved crypto and PKI support for Contiki-NG', 'text': 'MbedTLS is a lightweight cryptographic library designed for resource-constrained devices. In this project, we secure the popular IoT device management protocol LwM2M with DTLS from MbedTLS. The system is evaluated on the nrf52840 platform to gain insights on the overhead and possible optimisations of MbedTLS when integrated as a component into the Contiki-NG operating system.', 'links': '', 'contact': 'Jayendra Ellamathy <jayendra.ellamathy aat ri.se>, Joel Höglund <joel.hoglund aat ri.se>. Nicolas Tsiftes <nicolas.tsiftes aat ri.se>', 'tags': ['iot', 'cybersecurity'], 'teams': 'common_team_link'}, {'title': 'AutoPKI: automated and scalable transfer of trust (poster)', 'text': 'IoT deployments grow in numbers and size and long-time support and maintainability become increasingly important. To prevent vendor lock-in, capabilities to transfer control of IoT devices between service providers must be offered. We propose a lightweight mechanism for transferring control using standard-based building blocks and show that it maintains desired security requirements.', 'links': '', 'contact': 'Joel Höglund <joel.hoglund aat ri.se>', 'tags': ['iot', 'cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Designing Touch Interaction (poster)', 'text': 'In designing for touch interactions, we move beyond the traditional graphical user interface, and make use of the intelligence that resides in body. Through mid-sized haptic interactions directly touching the body, we create awareness and convey information. These interactions are showcased in two prototypes the Pelvic Chair, aimed at pelvic floor health, and the Re-engage Seat in collaboration with Volvo Cars aimed at re- or disengage drivers in semi-autonomous cars.', 'links': '', 'contact': 'Anna Ståhl', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'Digital twin Kista\xa0(demo)', 'text': 'In this demo, we will show work on a digital twin to capture energy use and user behaviors in our office as well as a 4d map of the surrounding area in Kista. The twin will be shown at a fair later in May and has been developed in collaboration with among others Kista Limitless and Urban ICT arena.', 'links': '', 'contact': 'Anton Gustafsson', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': 'Radio Fingerprinting for IoT intrusion detection', 'text': 'An attacker can gain access to IoT networks by imitating the identity of an authentic IoT node. Radio fingerprinting distinguishes devices based on their unique hardware imperfections and makes it harder for an attacker node to impersonate another node. In this work, we use contrastive learning to distinguish between authentic nodes and intruder nodes. Furthermore, we investigate the impact of neural network quantization on our radio fingerprinting intrusion detection system.', 'links': '', 'contact': 'Saptarshi Hazra <saptarshi.hazra aat ri.se>', 'tags': ['iot'], 'teams': 'common_team_link'}, {'title': '[CDA1] Data programming and Streaming', 'text': "There is an inherent need in our society for simpler and more effective ways to program data-driven systems. At one hand, high level declarative languages can be used to democratize data-driven applications, while at the same time automate code generation and optimisation for different target hardware. To that end, our team at RISE has led significant contributions in that area. This poster session highlights how we build on our prior work on Apache Flink's state management to further introduce Arcon: a next generation streaming platform that allows analytical queries, ArcLang: a novel language that can be used to program reactive compute- and data-centric applications and related contributions in MLIR, a current standard in multi-level compilation for data analysis.", 'links': '', 'contact': 'Frej, Klas, Max, Seif, Paris', 'tags': ['data', 'ai'], 'teams': 'common_team_link'}, {'title': '[CDA2] Graph ML Databases', 'text': "Around 80% of the industry's data query workloads by 2025 will be reducible to graph database queries according to Gartner. Graph databases currently take over the data management industry and RISE and KTH has a facilitating role in leading the creation of ORB: one of the most promising future graph database systems that will be able to support deep reasoning in polynomial time. Our architecture combines stream processing technology, error estimation and graph neural networks put together in a first-of-a-kind database system stack.", 'links': '', 'contact': 'Sonia, Paris', 'tags': ['data', 'ai'], 'teams': 'common_team_link'}, {'title': '[CDA3] Serverless computing on the edge', 'text': 'Serverless is undoubtedly a key technology for the future of software, allowing high flexibility in utility computing without the need to declare and maintain virtual infrastructure such as servers and VMs.  Despite its wide spectrum of applications, the serverless paradigm is currently inapplicable to edge computing due to the level of heterogeneity, asynchrony, uncertainty, and instability in such WAN-supported infrastructures. To that end, RISE is driving efforts to enable serverless computing across edge infrastructures. Our approach builds on decentralized resource management, synchronization primitives and principal application of transactional processing known in distributed databases in support of resilient service composition. Furthermore, we investigate faster ways to achieve state machine geo-replication while being robust to several types of network failures that can unexpectedly occur.', 'links': '', 'contact': 'Adam, Harald, Paris', 'tags': ['data', 'ai'], 'teams': 'common_team_link'}, {'title': '[CDA4] Privacy-preserving computing', 'text': 'Privacy preserving computation allows multiple parties to securely share sensitive data and collaborate on this shared data. We are working on better ways to compose and integrate privacy preserving workflows with existing workflows; an ecosystem with privacy focus and native support for privacy primitives such as data ownership and secure multi-party computation. We hope to use these to support both GDPR requirements, and collaboration via advanced secure workflows, embedded natively within a widely adopted actor middleware software package.', 'links': '', 'contact': 'Jonas, Paris', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Too slow and too expensive? Tools for software development', 'text': 'Do you need impartial help evaluating or engineering cutting-edge solutions for your software development process? Our researchers have decades of experience in adapting research results to solve industry problems. This session showcases some of our success stories, ranging from IDEs and compiler technology to automatic test case generation.', 'links': '', 'contact': 'Frej/Per/Peter/Mats', 'tags': ['data', 'ai'], 'teams': 'common_team_link'}, {'title': 'AI & Cloud platforms/infrastructure, where are you running your AI, HPC, Quantum?', 'text': 'Currently, using AI/ML tools comes with several challenges. i) The evolution of new methods and software frameworks is very rapid, so there is a need to constantly be able to try and evaluate the latest. ii) There is a need to find and allocate infrastructure resources to run AI/ML training and serving workloads, often using several different providers, a multi-cloud setup (public cloud and in-house resources). iii) The ease-of-use for typical complete setups including infrastructure and platforms is not at a level to allow domain experts \nWe present the status of ongoing work to address these challenges, based on recent developments in infrastructure-as-code tools. We look at multi-cloud aspects (portability and API harmonization across public cloud providers, HCPs), dynamic setup of test environments, and how all of this can be used to benchmark new AI/ML frameworks.', 'links': '', 'contact': 'Martin Körling', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Resource-efficient machine learning', 'text': 'Training a deep neural network can be a time-consuming process using days of wall-clock execution time on a large compute cluster. For instance, training the GPT-3 natural language model used 355 GPU-years of computation. Models can also become exceptionally large with GPT-3 weighing in at some 700 GB and Google Brain being almost ten times that size. With those compute requirements come large power requirements; the compute resources used for training the GPT-3 model correspond to close to 1GWh of electricity which, if generated by a coal fired power plant leads to the emission of close to 1000 metric tons of CO2.\nThe large compute requirements are caused by a combination of the considerable number of parameters of the models, the large amount of data used for training and the iterative nature of the training process (many small updates to the model parameters to gradually improve the results on the training set).\nWhen the model has been trained, it can be used for inference. For instance, a model trained to drive a vehicle using photos and videos of traffic situations is used to drive. Here, the compute demands are smaller since just a single input at a time is used rather than a large training set and each input is used once rather than many times to gradually adjust parameters. But resource demands may still be problematic since inference may occur in a more constrained environment, such as in a vehicle rather than in a data centre, and the acceptable latency may be a fraction of a second for each input rather than several days for the whole training process. Thus, there is a dire need to find resource efficient implementation methods for training as well as inference.', 'links': '', 'contact': 'Karl-Filip Faxén', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Automating air traffic control, (poster)', 'text': 'Much of our infrastructure is managed by humans in complex and advanced ways.  One example is air traffic control (flygledning).  It is a complex real-time management of distributed resources (airplanes and airspace) with operation procedures designed to work across jurisdictions, to conservatively handle both old and new airplanes, and to handle the unforeseen.  This makes it an interesting and challenging area to automate with computer-controlled automation.', 'links': '', 'contact': 'Lars Rasmusson', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Multilingual CLIP?, poster/demo', 'text': '', 'links': '', 'contact': 'Fredrik C', 'tags': ['data', 'ai'], 'teams': 'common_team_link'}, {'title': 'Big Data Analytics and AI for a Smarter Society', 'text': 'The rapid advancements in the field of AI and the abundance of data in a connected society are transforming the way we live and interact. In this poster we present a number of projects at RISE in which big data platforms and AI techniques are applied to improve our society in various ways including transport and automotive industry, e-health, and digitalization.', 'links': '', 'contact': 'Ahmad Al-Shishtawy', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Towards biologically inspired meta-learning (poster)', 'text': 'The brain is a von Neumann computer. We are now beginning to understand its assembly language instructions. It is time to figure out its basic program and data structures. One of the most fundamental software components of the brain seems to be a bootstrapping recursive meta-learning module. Understanding this better may lead us to new ways of representation learning and handling heterogeneous data.', 'links': 'https://www.ri.se/en/person/martin-nilsson , https://www.drnil.com', 'contact': 'Martin Nilsson', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': '“Jointly Learnable Self-Supervised Graph Representation Learning”', 'text': 'Recently, several SSL methods for graph representation learning have achieved performance comparable to SOTA semi-supervised Graph Neural Networks (GNNs). One of the key challenges is data-augmentation, for which existing methods rely on heuristically crafted techniques. In this study, we propose a novel method for jointly learning both the augmentation and representation by leveraging the inherent signal encoded in the graph. Besides, to allow efficient use of resources we propose a new architecture that augments in the latent space as opposed to the input space.', 'links': '', 'contact': 'Zekarias Kefato and Sarunas Girdzijauskas', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': '“Decentralized Graph Neural Networks”', 'text': 'Graph Neural Networks (GNNs) achieve state-of-the-art results in most graph representation learning benchmarks. However, compared to other deep learning models, their structure makes them hard to decentralize. Yet, decentralization is an important tool to achieve large-scale, data-private machine learning. In this work, we show how layer-wise, self-supervised learning may be used to train deep GNNs on a decentralized graph, where each node represents a separate computing device.', 'links': '', 'contact': 'Lodovico Giaretta and Sarunas Girdzijauskas', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': '“Explicit Spectral Graph Neural Network”', 'text': 'GNN outperforms CNN in classification tasks since data relationships are explicitly accounted for during the training and testing. However, the relative relations between training and test data embeddings are not readily available for most datasets, preventing using GNN in most datasets. This work proposes to learn such a relation of training and test data embeddings into an affinity matrix using a spectral clustering setup. This affinity matrix and the eigenvector embeddings (from the spectral clustering) are the two components utilized for message passing in the GNN setup. We can observe an improvement in classification on popular datasets (i.e., MNIST and fashion MNIST) while utilizing a fraction of the labels from the training data.', 'links': '', 'contact': 'Vangjush Komini, Debaditya Roy and Sarunas Girdzijauskas', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': '"Representation Learning on Heterogeneous Information Networks (HINs)"', 'text': 'Graph representation learning (GRL) is a common approach to network mining and analysis. GRL is a set of techniques where the objective is to learn the graph/network structure and construct latent feature vector representations (embeddings) for the nodes and edges in the graph. Learning high-quality representations can be useful in automating prediction and other downstream tasks such as search and personalized recommendation. While most real-world networks are heterogeneous in nature, recent research efforts have focused on learning over homogeneous graphs. The typical complex rich structures of heterogeneous graphs likely cause the existing learning methods to fall inadequate when applied on them. In this poster we present a novel unsupervised model for learning node embeddings based on the structure of the graph. The new learning method is designed for heterogeneous graphs with learnable attention weights over the edge types in the vicinity of each node whose embedding is being learned.', 'links': '', 'contact': 'Ahmed Emad and Sarunas Girdzijauskas', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'MiniZinc for Problem Solving', 'text': 'Problems such as timetabling, scheduling, planning and rostering are central and often cost-critical components of many software solutions. Such problems are intrinsically hard to solve. RISE has a long track record in the theory, software and practice of solving those problems. A new interchange language, MiniZinc, for expressing such problems has recently emerged. This poster will give a brief introduction and some examples.', 'links': '', 'contact': 'Mats Carlsson', 'tags': ['software'], 'teams': 'common_team_link'}, {'title': 'Rallying around AI – RISE Center for Applied AI', 'text': 'TBA', 'links': '', 'contact': 'Magnus Hultell', 'tags': ['data', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Reinforcement Learning for radio resource management', 'text': 'Radio access networks beyond 3G divide and multiplex use of the radio resource into discrete channels and time frames. The resources are allocated to user devices and scheduled on antenna beams. Scheduling resources on beams that interfere, reduces efficiency of resource usage.  Our result shows that it is possible train neural networks using reinforcement learning and and advanced network simulator. This is Joint work with Diarmuid Corcoran at Ericsson AB, who also funded the work at RISE.', 'links': '', 'contact': 'Per Kreuger', 'tags': ['datascience', 'ai', 'software'], 'teams': 'common_team_link'}, {'title': 'Complex AI systems -\xa0The value of hybrids of AI techniques', 'text': 'For practical applications of AI based and autonomous systems, it is often not sufficient to use a single AI technique, but a system made up of combining several techniques may be required. Often this can be a combination of data-driven and domain-knowledge-based techniques. Here I will describe a general methodology for such hybrid AI systems, and exemplify with some recent projects.', 'links': '', 'contact': 'Anders Holst, Per Kreuger', 'tags': ['datascience', 'ai'], 'teams': 'Titel: Causal aware machine learning'}, {'title': 'Natural Language Reasoning (NLR)', 'text': 'The goal of the NLR project is to develop machines that, based on information in text, are capable of reasoning on a human level.  NLP applications, which use text as a data source, are lousy at reasoning, which is an obstacle to improvements to existing solutions and to the development of new applications.', 'links': '', 'contact': 'Jan Ekman, Björn Bjurling, Björn Gambäck', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'IRRA Intent recognition for autonomous vehicles', 'text': "Intention recognition is the task of inferring an agent's intention based on its previous actions. It is crucial for human social intelligence which in turn enables understanding of, and the ability to predict, other humans' behaviours, such as for example other drivers' intent to overtake, stop, turn, or switch lanes. For making situation-based decisions, both autonomous and human drivers need to take the intentions of surrounding vehicles into account. This is especially true in a mix of autonomous and human drivers. \nExisting algorithms and models for intention recognition need to be improved with respect to accuracy, robustness, transparency\xa0and scalability, to meet the requirements of the Swedish automotive industry and Trafikverket. This lack of knowledge is a bottleneck for the automotive industry, prohibiting the creation of novel advanced and intelligent automotive services and products based on social intelligence and intention recognition. \xa0\nThe FFI project IRRA (2019-2024) aims at improving existing algorithms and at developing new logic-statistical hybrid algorithms for intention recognition that are specifically suited for the needs of the Swedish automotive industry.", 'links': '', 'contact': 'Björn Bjurling', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Socio-economic effects of hard and soft digital infrastructure: from modelling to visualizing', 'text': 'The connected society unit is building models to quantify and visualize the socio-economic cost and  benefit of digitalization, both in terms of hard infrastructure (e.g. fibre connectivity) and services. In this poster we give an overview of our tools and models, using two examples.\nThe first is a model of the social economic impact (in terms of entrepreneurship, CO2 emission, population evolution and employment) of fiber broadband access on the municipality level in Sweden using fixed-effect regression controlling both municipality- and time-fixed effects over an 8−year perspective, and analyzed effects in urban and rural areas.\nThe second is a dashboard style interactive visualization tool with dynamic time evolution controlling for different digitalization steps. The tool visualizes 3 groups of effects that the digitalization evolution brings to involved stakeholders, coming from the digitalization evolution of building permit handling process in Sundsvall municipality. A demo will be given to the interested visitor.', 'links': '', 'contact': 'Jie Li, Marco Forzati', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Identifying causal relationships of cancer treatment and long-term health effects among 5-year survivors of childhood cancer in Southern Sweden', 'text': 'Survivors of childhood cancer can develop late effects in adulthood. Knowledge about possible late effects can improve childhood cancer treatments and assist in follow-up. \nWe developed a method to identify causative links between treatments and health outcomes. We applied it to a Swedish patient cohort and identified 98 causative links between treatments and outcomes, many of which are already known. Some, however, have not been previously described, including links between certain treatments and eye conditions or viral infections. We also confirm that childhood cancer survivors use more health care and have a higher mortality compared to the general population. \nThis study helps to create a better understanding of the late effects of cancer treatment in children and may help to guide strategies to monitor and treat children to avoid these effects.', 'links': '', 'contact': 'Helena Linge, Jan Ekman, Anders Holst', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Privacy preservation by FHE enables data sharing in digital health management', 'text': '-RISE entry to the Vinnova innovation competition Vinter 2021-22-\nWe present our experience at the Vinter competition 2021 organized by Vinnova. The Vinter competition invited solutions for digital health with a focus on interoperability. Our entry addresses privacy preservation by fully homomorphic encryption (FHE), and supports legal interoperability between e.g. users, health care and third party service providers. The work describes implementation of FHE in a digital health landscape. Its benefits, limitations and its potential for AI-based applications are discussed.', 'links': '', 'contact': 'Rickard Brännvall, Henrik Forsgren, Helena Linge, Marina Santini, Alireza Salehi, Fatemeh Rahimian', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Swedish AI Society annual workshop June 13-14 – hosted by RISE', 'text': 'Welcome to SAIS 2022: the 34th Swedish Artificial Intelligence Society (SAIS) annual workshop. The SAIS workshop has since its first edition been a forum for building the Swedish AI research community and nurturing networks across academia and industry. We invite researchers and practitioners in AI and related disciplines, in Sweden and the rest of the world, to join us in exchanging knowledge, news and results on AI related theory and applications.  \nSAIS 2022 is hosted by RISE and will take place in Stockholm, Sweden, on June 13-14, 2022. The event is planned to be hybrid combining in-person and virtual participations.', 'links': '', 'contact': 'Åsa Rudström (General Conference Chair), Sepideh Pashami, Magnus Hultell, Anders Holst, Lena Nilsson', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Machine Learning for Causal Inference in Observational Studies', 'text': 'To show a causal relation we need to observe the outcome of a treatment (factual), as well as the outcome in case the treatment had not been assigned (counterfactual). The fundamental problem of causal inference is that we can only observe one of the two potential outcomes. The gold standard solution is to run randomized controlled trials, which comes with its own limitations and pitfalls. Observational studies, including cohort studies, are an alternative, but they can normally only find associations and not causal relations. With the abundance of huge datasets, in healthcare or social studies, that are collected over many years, can machine learning models provide a solution for causal inference? What are the requirements, possibilities and limitations?', 'links': '', 'contact': 'Fatemeh Rahimian', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Learning Causal Predictors', 'text': 'Machine learning (ML) models have shown great success in the fields of image processing, language processing and stock market trading. One of the reasons behind its success is their great ability to learn patterns and correlations from big data. Nevertheless, these models still lack on robustness when deployed in different environments, i.e., when exposed to unseen scenarios. One major drawback with current ML models is that they do not learn causation, instead weigh spurious features in predictions. A way to ease this problem is to add causal knowledge to ML models. Here we propose to add causal relations (causal parents and causal children) into ML models. We compare the robustness of simple ML models using synthetic data, with and without causal information.', 'links': '', 'contact': 'Abhishek Srinivasan, Anders Holst', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Pre-training Transformers for Molecular Property Prediction Using Reaction Prediction (Poster)', 'text': 'Molecular property prediction is an important task within chemistry with application in drug discovery. However, the amount of available data on molecular properties is often very limited. Transfer learning has had a tremendous impact on fields like computer vision and Natural Language Processing and if it could be used within molecular property prediction it would have an impact of similar magnitude as in the aforementioned fields. We present a pre-training process for molecular representaiton learning using reaction data. The pre-training step is formulated as a reaction prediction task using a Transformer on SMILES and is evaluated on 12 molecular property prediction tasks from MoleculeNet within physical chemistry, biophysics and physiology. We can demonstrate a statistically significant positive effect on 9 of the 12 tasks compared to a nonpre-trained baseline model.', 'links': '', 'contact': 'Johan Broberg, Erik Ylipää', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Machine learning for predicting water flow intensity based on physical characteristics of catchment area (Poster)', 'text': 'In this pre-study we have investigated an ML model for water flow intensity prediction, which is given rain and temperature measurements and a top-view map of a catchment area. Given this input, the model outputs a water flow intensity map of the same spatial extent as the input map. Early results suggest that our ML model is able to predict water flow intensity more accurately than comparable baselines.', 'links': '', 'contact': 'Aleksis Pirinen, Olof Mogren', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'AI for determining whether a person is under the influence based on recorded eye scans (Poster)', 'text': 'In this project, executed together with Eyescanner Technology AB, we are developing an AI system for determining whether a person is under the influence of drugs based on recorded eye scans. The two founders of Eyescanner have previously worked in the police, and their goal is to provide a technology which can improve upon the contemporary manual approach for deciding whether a subject is under the influence.', 'links': '', 'contact': 'Olof Mogren, Aleksis Pirinen', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Semi-supervised few-shot learning for sound event detection (Poster)', 'text': 'In this project we introduce a semi-supervised method for the training of embedding functions to be used in downstream few-shot learning tasks.\nWe include unlabeled data from the downstream task of interest as well as unlabeled data from the base data set and show how these can be included in an episodic training scheme by introducing a novel loss function for prototypical networks.', 'links': '', 'contact': 'Martin Willbo, Olof Mogren', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'AI to learn about porcelain (Poster)', 'text': 'This project is a collaboration with Rörstrands Museum, in which we develop a machine learning model to gain knowledge about porcelain from images. The model will build upon the digital archives of the museum, and the end goal is a service where people can upload images and learn about their own Röstrand porcelain.', 'links': '', 'contact': 'Ebba Ekblom', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Teaching a computer about beauty for image-based recommendations (Poster)', 'text': 'The field of recommendation systems is dominated by collaborative filtering approaches that exploit vast datasets of user-item interactions to select the most relevant items for any given user. However, in social networks the popularity of items depends to a large degree on the author’s popularity, and the system can be exploited by user groups conspiring to push specific content regardless of its quality. An objective assessment of content quality independent of its social impact would be a valuable addition to many recommendation systems, but objective quality is often difficult to define. In this project we use a large image dataset derived from a social network for photographers, and manually labeled by experts, for a binary classification between photos that are visually outstanding and a random selection from all other photos. The network’s output scores let us create a ranking of the images that is in line with human appraisals, allowing for the preliminary conclusion that the network has learned to recognize beauty in images.', 'links': '', 'contact': 'Leon Sütfeld', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Machine learning and acoustic monitoring for wildlife conservation (Poster)', 'text': 'In this PhD project we develop annotation efficient machine listening methods for soundscape analysis. We demonstrate the methods on recordings from wildlife conservation projects. In ecological research, years of audio data from natural habitats are being recorded using cheap acoustic sensors and machine listening is a promising way towards automated analysis.', 'links': '“Computational bioacoustics with deep learning: a review and roadmap”, https://arxiv.org/abs/2112.06725, “Perspectives in machine learning for wildlife conservation”, https://www.nature.com/articles/s41467-022-27980-y', 'contact': 'john.martinsson aat ri.se', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Distributed machine learning (poster)', 'text': 'The study of machine learning on decentralized data has been an interest for a long time, and has relations to many different research communities, such as cryptography, databases and data mining. The overarching goal being to efficiently learn from and analyze data distributed among several users, without the data leaving each user. Research in this field has become increasingly important in recent years. Smart and connected devices are continuously being adopted and more widespread, and the equipped sensors are improving and collecting a lot of data at a fast pace, which gives rise to a need for algorithms that can efficiently handle the large volumes of distributed data. \nFederated learning (FL) is a distributed machine learning framework where a central server orchestrates the training of clients to learn a model on decentralized data. This entails several questions, and many challenges have emerged that are expected to grow in the near future.\nHowever, a central server might not always be available or even desirable, as it can be a large bottleneck or a possible source for malicious attacks. Decentralized machine learning is a research field addressing such problems. The aim of this PhD project is to study challenges and advance the research in both federated and decentralized learning. Open problems in these fields include developing algorithms for data heterogeneity, personalization, efficient communication, model compression and many more.', 'links': '', 'contact': 'Edvin Listo Zec', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Resource-Efficient Multlingual NLP', 'text': 'Natural language processing (NLP) is the computational processing of human language, with applications such as machine translation, summarization and question answering. Like all areas of AI, NLP has witnessed tremendous progress in recent years through the development of complex neural network models that can learn effectively from very large amounts of data. Models like GPT-3 with billions of parameters, trained on terabytes of language data, exhibit unprecedented language processing capabilities and make headline news, but they also present important challenges. How can we make resource-efficient NLP available in situations where we do not have access to super-computers? And how can we deliver high-quality NLP for languages with more limited resources than English and a few other languages, so that a larger part of the world’s population can benefit from the technology? A promising approach to the second problem is to train multilingual models on data from multiple languages, hoping that the languages will mutually reinforce each other. Unfortunately, the effect observed has often been the opposite, with suboptimal performance compared to monolingual models, especially for low-resource languages, and with quality decreasing as more and more languages are added, an effect that has become known as “the curse of multilinguality”. In this project, we explore modularization and model compression as key techniques for making multilingual NLP models more effective, by delivering higher quality for more languages, and more efficient, by requiring less resources to deliver these results.', 'links': '', 'contact': 'Joakim Nivre', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Cross-lingual transfer of monolingual models, poster', 'text': 'Recent studies in cross-lingual learning using multilingual models have cast doubt on the previous hypothesis that shared vocabulary and joint pre-training are the keys to cross-lingual generalization. We introduce a method for transferring monolingual models to other languages through continuous pre-training and study the effects of such transfer from four different languages to English. Our experimental results on GLUE show that the transferred models outperform an English model trained from scratch, independently of the source language. After probing the model representations, we find that model knowledge from the source language enhances the learning of syntactic and semantic knowledge in English.', 'links': '', 'contact': 'Evangelia Gogoulou', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Topic modelling and alternatives for open-ended survey responses (poster)', 'text': 'Open-ended survey responses are a frequently used tool to study a variety of phenomena in social sciences. In this context, topic models can be employed to identify shared topics in a collections of text. However, the short and often incomplete nature of open-ended survey responses represents an issue for traditional topic modelling approaches designed for collections of entire documents. Even topic models specifically designed for short texts may not always produce interpretable topics. We investigate the applicability of clustering sentence-embeddings by pre-trained language models fine-tuned for textual semantic similarity and compare the resulting clusters to a biterm topic model, designed for topic modelling over short texts.', 'links': '', 'contact': 'Luise Dürlich', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'Towards patent data-driven chemicals control using artificial intelligence (Poster)', 'text': 'Patent data contains information about usage of chemicals in products before they are introduced to the market. To detect and proactively regulate the use of hazardous substances is of considerable value for society’s chemicals control. In a feasibility study, RISE, the Swedish Chemicals Agency and the Swedish Intellectual Property Office have demonstrated that natural language processing has great potential to be applied for this very purpose.', 'links': 'https://www.kemi.se/publikationer/pm/2022/pm1-22-dataanalys-av-patentinformation-med-hjalp-av-artificiell-intelligens', 'contact': 'Erik Ylipää, Olof Görnerup, Magnus Hultell', 'tags': ['datascience', 'ai'], 'teams': 'common_team_link'}, {'title': 'ICE Test & Demo Datacenter', 'text': 'Sweden needs sovereignty and skills from the ground to the cloud. To support research and innovation projects for all of RISE in all areas from AI to data center heat reuse RISE has a test & demo facility called ICE in Luleå. World leading research in a number of areas is supported by two compute modules with thousands of CPU servers and 250 GPUs and a facility test lab containing compute modules, edge testbeds, liquid cooling testbed, wind tunnels, climate and heat chambers.', 'links': 'https://www.ri.se/ice', 'contact': 'Tor Björn Minde', 'tags': ['datacenter'], 'teams': 'common_team_link'}, {'title': 'WeDistrict : Fuel cells and excess heat from datacenters put to use', 'text': 'Recovering heat from datacenters is a great opportunity, but also very challenging since the temperature of the heat often is low. In this project we are building a demonstrator to combine liquid cooled data center technology with solid oxide fuel cells, to maximize the system waste heat temperature, and in the same time produce green power for the servers running in the liquid cooled datacenter. The generated heat will be transferred to the local district heating network without using additional heat pumps, which normally is used when heat from datacenters is recovered and used for district heating purposes.', 'links': 'https://www.wedistrict.eu/', 'contact': 'Jonas Gustafsson', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'E2P2 – Eco Edge Prime Power', 'text': 'The E2P2 project will create a POC alternative prime power source that employs fuel cell technologies for on-site power generation of data centers. The concept of connecting fuel cells to gas networks to power resilient urban and edge data centres overcomes the need to have backup generation, thus reducing the emissions. The project will also create an open standard for fuel cell adaption to power data centres and analyse the combined social, environmental and commercial impact.', 'links': 'https://e2p2.eu/', 'contact': 'Jeanette Petersson', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'Power on the edge - more than a data center', 'text': 'To provide the brains for all of our low latency computing needs, a new generation of edge data centers is making their way to our cities. However, at the same time the electrical grids in our cities are becoming increasingly congested and unstable. Within a growing portfolio of projects, we are looking for smart methods to design and operate these edge data centers so that the overall effect on the grid would be positive as e.g. virtual power plants or partaking in the frequency reserve.', 'links': 'https://aniara.ai-net.tech/', 'contact': 'Mikko Siltala', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'Environmental impact of data centres', 'text': 'In light of continuous digitalization, we as society are becoming more and more dependent on data centre services. Yet, little is known about the sustainability of data centres, the impact of operating them and the hotspots that are responsible for most of it. This poster presentation will explain how sustainability can be assessed and discuss the environmental performance of data centres.', 'links': 'https://www.ri.se/en/stani-borisova-presented-data-centers-lca-life-cycle-assessment', 'contact': 'Stani Borisova', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'Data center excess heat reuse, a matter of enhanced food self-sufficiency', 'text': 'During the worldwide pandemic and unstable world peace the import dependency from other countries has become obvious, whereas for Sweden most of the food has its origin in south of Europe. To enhance the food self-sufficiency focused work has been done at RISE ICE data center to evaluate the possibilities to utilize the data center excess heat for farming and food production. The north of Sweden which has the lowest levels of self-sufficiency it´s shown that 1 MW of data center power could increase the level with up to 8%.', 'links': 'https://www.ri.se/en/dc-farming-a-guideline-for-implementing-data-center-and-greenhouse-symbiosis', 'contact': 'Mattias Vesterlund', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'Homomorphic encryption for CPS', 'text': 'The design of intelligent control algorithms can be costly and is an investment that must be protected against reverse engineering. It can be safeguarded by running remotely from the cloud instead of locally on the equipment hardware, however such set-up requires careful consideration of customer data confidentiality. Fully Homomorphic Encryption is an emerging technology that permits computation on encrypted data and offers a solution that protects both customer data and manufacturer IP.', 'links': '', 'contact': 'Rickard Bränvall', 'tags': ['datacenter', 'edge', 'cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Thermal energy storage for data centers:', 'text': 'EDGE- solutions with small calculation clusters is a strong upcoming trend within the data center sector. With an optimized operation of the EDGE data center and a well dimensioned thermal energy storage (TES), the energy use for the datacenter (DC) can be minimized and with that also their climate footprint. In this poster session we will present one of our projects, DIR Borö, at RISE ICE datacenter, were we tested and evaluated the performance of a thermal energy storage tank at our EDGE test bed to see how long the tank can cool the datacenter without any additional energy.  If you are interested to see the results and learn more, please visit our session!', 'links': '', 'contact': 'Tina Stark & Adrian Mellgren', 'tags': ['datacenter', 'edge'], 'teams': 'common_team_link'}, {'title': 'Empowering a Pan-European Network to Counter Hybrid-Threats', 'text': 'In the EU-HYBNET project, a Horizon 2020 coordination and support action over 5 years with 25 partners, we network with security practitioners, stakeholders, academics, industry players, and SMEs to find new and enhanced means to counter hybrid threats. We define common requirements, deal with performance needs, monitor research and innovation, deliver recommendations for uptake and industrialisation of promising innovations and associated standardization.', 'links': 'https://euhybnet.eu/', 'contact': 'rolf.blom aat ri.se', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Security Roadmap Towards 6G Systems', 'text': '6G system is in an active race to be fully deployed by 2030. 6G system is expected to provide ultra-low latency, low power consumption, ultra-high capacity, seamless coverage, high localization precision, massive MIMO (small cell), millimetres-wave (mmWave), terahertz (THz) bands. Consequently, these high-performance specifications will enable new technologies within 6G systems such as the internet of everything (IoE), multi-sensory X reality (XR), autonomous systems, Artificial intelligence (AI), machine learning (ML), heterogeneous wireless networks (HWN), intelligent and distributed environments, cell-free and visible light communications, wireless brain-computer interactions, etc. These new technologies will significantly impact the security and privacy of the upcoming 6G system. Therefore, novel security techniques (encryption, authentication, privacy-preserving, key agreement, access control) or some fundamental changes must be considered; for instance, distributed mutual authentication protocols are highly required for some 6G-based emerging technologies (e.g., HWN, IoE), whereas end-to-end security and encryption protocols are necessary for some others emerging technologies. Hence, extensive research works are supposed to be carried out to meet all these security requirements as well as to ensure the reliability and functionality of the upcoming 6G system.', 'links': '', 'contact': 'Mohammed Ramadan', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'End-To-End Secure Group Communication for the IoT', 'text': 'The security protocol Group OSCORE enables end-to-end protection of CoAP messages exchanged in a group communication scenario. This especially protects a request message that a CoAP client sends to multiple CoAP servers (e.g., over IP multicast) and the corresponding response messages sent as reply over unicast. Group OSCORE provides two possible modes of operation: the group mode encrypts a message and digitally signs it with the private key of the sender; the pairwise mode encrypts and authenticates a message with symmetric keying material derived through Static-Static Diffie-Hellman from the asymmetric keys of the sender and the exact single recipient. When joining a group, new group members are provisioned with the necessary Group OSCORE keying material, by interacting with the responsible Group Manager. The joining procedure relies on the ACE framework for authentication and authorization, which ensures that only nodes authorized to become group members can successfully join the group.', 'links': '', 'contact': 'Marco Tiloca', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Innovation node in cybersecurity - Cybernode.se', 'text': 'RISE is running a national cyberscurity collaboration to accelerate research and innovation in the industry and public sector – a national node in cybersecurity. VINNOVA is responsible for the funding, while RISE’s cybersecurity unit coordinates the node’s work.', 'links': '', 'contact': '', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Intrusion detection in cloud containers', 'text': 'The popularity of containerization has extremely increased among organizations during last decade since container solutions offer multiple features consenting high time and cost savings and incomparable agility in application development and management processes. Nonetheless, cloud containers are an appealing target of malicious actors who look at virtualized applications as a new opportunity to exploit the huge amount of cloud resources and enforce their malicious activities. Cyber-attacks targeting virtualized applications with the aim of hiddenly stealing resources and private data have been widely demonstrated. When in-app protections fail to detect and prevent such attacks, it is crucial that the hosting operating system provides additional and innovative capabilities for monitoring container resources and detecting hidden malicious behaviours. Within the Cybersecurity Unit, we are currently working on AI solutions tailored to empower malware/intrusion detection in virtualized systems (e.g., cloud containers), with a focus on the analysis of data features observable by the cloud service provider at the operating system level (e.g., Linux-kernel system calls) and at the network level (e.g., network packets).', 'links': '', 'contact': 'Alfonso Iacovazzi', 'tags': ['cybersecurity', 'software'], 'teams': 'common_team_link'}, {'title': 'Human-Centred Cybersecurity', 'text': 'Is Cybersecurity gendered? We do not normally think about computer science concepts, such as encryption or network protocols, as being unequal or gendered. Yet while the cybersecurity domain has produced impressive technical advances, the diversity of life experiences and ways of working with and through technology has at times been overlooked, to the detriment for marginalised communities such as women. For example, within intimate relationships privacy threats can arise from the lack of appropriate design to recognize different data sensitivities within relationships. Such an oversight has resulted in lack of security strategies that can act against these intimate threats, and not just financial or political threats. Such blind spots result in technology that can be used by abusers to perpetrate violence and harm in abusive relationships. Engaging with more diverse perspectives can lead to a more diverse cybersecurity that needs to include the perspectives of those who would not normally be included in research on cybersecurity (e.g. women, elderly, migrant workers, etc.). This becomes increasingly important as technologies such as IoT, smart homes and smart cities are increasingly embedded into the fabric of our world. Drawing on Human-Computer Interaction research and feminist standpoint theory and approach, we aim at empirically answering questions such as: How can we design a feminist cybersecurity?', 'links': '', 'contact': 'Asreen Rostami', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Key Update for OSCORE (KUDOS)', 'text': 'The Constrained Application Protocol (CoAP) is an application layer protocol designed for resource-constrained internet devices. Its design is similar to HTTP, although running over UDP and meeting specialized requirements such as multicast support, low overhead, and simplicity for constrained environments. Object Security for Constrained RESTful Environments (OSCORE), which was published as a standard in 2019, is a method for protection of CoAP messages providing end-to-end security, designed for constrained nodes and supporting proxy operations. Devices communicating using OSCORE may need to renew their shared keying material due to a number of reasons, such as reaching security limits for the number of operations performed with the encryption keys. Key Update for OSCORE (KUDOS) is a lightweight procedure that two peers can use to update their keying material and establish a new OSCORE Security Context. It is intended to obsolete the current procedure defined for OSCORE and provides a number of additional benefits such as forward secrecy.', 'links': '', 'contact': 'Rikard Höglund', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Vulnerability Analysis for Establishing More Secure Systems', 'text': 'Cyber-attacks are on the rise. For instance, most famed autonomous and/or electric cars are shown to be vulnerable as in the example of Tesla hacking showcases. Cybersecurity of any system should start from the attacker point of view, which might be referred to as “counter-intuitive” analysis. As such, Vulnerability Analysis helps researchers and especially security experts understanding limits of their cyber-defences as well open gaps (called vulnerabilities) that their defences fail to cover. Vulnerability Analysis of the systems and subsystems is utmost important for the cybersecurity experts in the intended domain while building/revisiting their cyber-security measures against adversaries. To ensure that organizations and their products are on the cyber-secure side of the spectrum while devising your next-generation products/services, it is central to ensure that these are cyber-secure, systems and subsystem components (along with their interactions with the surrounding peripherals, users, and the infrastructure) need to be analysed with agile Cyber-Security approaches such as Vulnerability Analysis and Attack Graphs.', 'links': '', 'contact': 'Ismail Butun', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Securing the Next Generation of Industrial Control Systems', 'text': 'Industrial Control Systems (ICS) are becoming more and more connected. While connecting systems increases flexibility productivity in ICS, it also introduces risks and security vulnerabilities. Media have reported several cyberattacks against ICS, and security is a top priority in the next generation of ICS. High availability requirements and severe consequences of cyber-attacks make securing ICS a challenging problem. In the next generation of industrial control systems, often called Industry \uf63c.\uf639,\nmost parts are assumed to be connected. Securing Industry 4.0 require research into secure communication, device management protocols and resilient software for ICS devices and Industrial IoT devices.', 'links': '', 'contact': 'Martin Gunnarsson', 'tags': ['cybersecurity', 'iot'], 'teams': 'common_team_link'}, {'title': 'Federated Learning for IoT Security', 'text': 'With the introduction of new privacy laws such as GDPR in the EU encouraging (and in some cases mandates) sharing only minimal amounts of data, centralized machine learning trained with Big Data becomes infeasible.  Federated Learning (FL) has emerged as a very promising paradigm for training distributed ML models. It allows to train a ML model collaboratively so that each participant in the learning task trains the model locally without sharing any private data. However, it brings new challenges such as communication overhead, statistical and systematical heterogeneity. These challenges have been proved that they degrade model’s performance and make learning process more difficult. Within Cybersecurity Unit, we are working on applications of FL to solve IoT security problems. Meanwhile, we address the challenges of FL, and strengthen FL in different aspects.', 'links': '', 'contact': 'Han Wang', 'tags': ['cybersecurity', 'ai', 'iot'], 'teams': 'common_team_link'}, {'title': 'Formal verification of communication protocol', 'text': 'Our global ecosystem requires secure communications. To this end, protocols are specified and standardized. Formal verification is a useful tool that helps model and analyse these specifications to ensure they provide the required security properties.\nStrength:\n•  Strong guarantees w.r.t. the model \n• Can be automated / tool-assisted\n• Provides early guidance and feedback during design (before implementation)\nChallenges (a.ka. research opportunities):\n• Adequation between model and reality\n• Lack of intuitiveness (esp. for large scale adoption)', 'links': '', 'contact': 'Simon Bouget', 'tags': ['cybersecurity', 'software'], 'teams': 'common_team_link'}, {'title': 'Cyber Range training and education', 'text': 'In order to raise cybersecurity competence among people working in Swedish organizations RISE is now offering Cyber Range courses that can provide hands on experience to better prepare people for potential threats. The courses target different segments within the organization to provide training tailored specifically to programmers, IT professionals and decision makers. Participants will get to experience and perform cyber-attacks in a virtualized environment to get a better understanding of how to protect their systems and properly respond in the case of an incident.', 'links': '', 'contact': 'Gustav Midéus', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': 'Trusted Execution Environments for Resource-constrained IoT', 'text': 'Securing IoT devices is vital today as the security risks associated with these devices grow rapidly. The increase in Trusted Execution Environments (TEEs) in resource-constrained embedded device (i.e., TrustZone-M) in the critical infrastructure is a step towards isolation and secure execution of software. TEEs provide efficient mechanisms to isolate system resources and hence play a significant role in security-critical operations such as secure boot, crypto operations, software/firmware update and remote attestation. In the Cybersecurity Unit, we work on identifying and resolving challenges in TEEs like securing the inter-world communication, mitigating unauthorized activities within devices and remote attestation of software-state integrity.', 'links': '', 'contact': 'Anum Khurshid', 'tags': ['cybersecurity'], 'teams': 'common_team_link'}, {'title': '5G Edge Testbed', 'text': 'Computing resources at the network edge, combined with low latency 5G networking is enabling a new class of real-time, compute intense applications. In a 5G testbed hosted by Luleå university of technology, RISE is providing a compute-cluster at the network edge. This combined platform is used to host experimentation at the infrastructure and application levels, to accelerate the adoption of edge computing and AI at the edge.', 'links': 'https://www.ri.se/sv/ice-datacenter/erbjudande/ice-datacenter-edge-och-5g', 'contact': 'Emil Svanberg', 'tags': ['data', 'edge', '4G/5G/6G'], 'teams': 'common_team_link'}, {'title': 'Digital Earth Sweden', 'text': 'Massive quantities of earth observation data are collected every day. Before they can be analyzed, many obstacles such as data storage and processing must be overcome. We lower the thresholds by offering standardized interfaces for accessing and processing the data. The goal is to increase productivity in research and production applications.', 'links': 'https://digitalearth.se/', 'contact': 'Joel Sundholm, Johan Carlstedt', 'tags': ['data'], 'teams': 'common_team_link'}, {'title': 'Data-science for Earth Observation Data', 'text': 'Via satellite-mounted imaging devices, earth observation gathers information used to assess the status of, and changes in the environment. The Digital Earth Sweden hub is building EO competence through pilot projects. Some examples are coastline change detection or monitoring of grassland grazing. The methods investigated will be adapted to use on powerful computer clusters.', 'links': 'https://rymddatalabbet.se/, https://www.ri.se/sv/vad-vi-gor/projekt/ai-for-arealovervakning-en-forstudie, https://www.ri.se/sv/vad-vi-gor/projekt/digital-earth-sweden', 'contact': 'Nuria Agues Paszkowsky, Erik Källman', 'tags': ['data', 'datascience'], 'teams': 'common_team_link'}, {'title': 'AI-Ecosystems – ENCCS', 'text': 'ENCCS is the Swedish part in the project EuroCC with 33 members. The project aims to elevate the participating countries to a common high level in the fields of HPC, HPDA and AI. RISE is part of establishing ENCCS , we want to help SME, industry and public sector to start use to possibilities with HPC, HPDA, and AI.  We provide activities and competencies to provide training and access to HPC.', 'links': 'https://www.enccs.se', 'contact': 'Jeanette Nilsson', 'tags': ['ai'], 'teams': 'common_team_link'}, {'title': 'colonyOS – a meta operating system', 'text': 'ColonyOS is a meta operating system for establishing trusted compute environments across decentralized, heterogeneous compute platforms. Each Colony is an abstract collection of compute nodes operating under a single identity, using a crypto protocol to enable secure and zero-trust process execution in arbitrary compute networks. This makes it possible to orchestrate complex machine learning workloads in compute continuums spanning devices, clouds and edge networks.', 'links': 'https://github.com/colonyos, https://colonyos.io', 'contact': 'Henrik Forsgren, Thomas Ohlsson Timoudas', 'tags': ['software', 'ai', 'cybersecurity', 'edge'], 'teams': 'common_team_link'}, {'title': 'Edge Computing, service continuity', 'text': 'Edge computing is an opportunity for service providers to expand their services by offering computation resources at the edge of the network.  Cellular networks provide mobility for basic services such as voice and data. Similar mobility support is needed to hand over from one edge host to another while maintaining service continuity. Edge services should enable live migration of application instances and context to the next optimal target Edge host.', 'links': '', 'contact': 'Hamid Reza Faragardi', 'tags': ['software', 'edge'], 'teams': 'common_team_link'}] };

    /* src/App.svelte generated by Svelte v3.47.0 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (40:4) <Hoverable let:hovering={active} >
    function create_default_slot_5(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*section*/ ctx[23].title + "";
    	let t0;
    	let t1;
    	let br0;
    	let t2;
    	let small0;
    	let t3_value = /*section*/ ctx[23].text + "";
    	let t3;
    	let t4;
    	let br1;
    	let t5;
    	let small1;
    	let a;
    	let t6;
    	let a_href_value;
    	let t7;
    	let br2;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*section*/ ctx[23], /*index*/ ctx[15]);
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
    			add_location(b, file, 42, 7, 1037);
    			add_location(br0, file, 42, 86, 1116);
    			add_location(small0, file, 43, 7, 1128);
    			add_location(br1, file, 43, 37, 1158);
    			attr_dev(a, "href", a_href_value = /*section*/ ctx[23].link);
    			add_location(a, file, 44, 14, 1177);
    			add_location(small1, file, 44, 7, 1170);
    			add_location(br2, file, 44, 63, 1226);
    			add_location(p, file, 41, 6, 1026);
    			attr_dev(div, "class", "card svelte-7wx43s");
    			toggle_class(div, "active", /*active*/ ctx[16] || /*c1i*/ ctx[3] == /*index*/ ctx[15]);
    			add_location(div, file, 40, 5, 875);
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
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*section*/ ctx[23].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 1 && t3_value !== (t3_value = /*section*/ ctx[23].text + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = /*section*/ ctx[23].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*active, c1i*/ 65544) {
    				toggle_class(div, "active", /*active*/ ctx[16] || /*c1i*/ ctx[3] == /*index*/ ctx[15]);
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
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(40:4) <Hoverable let:hovering={active} >",
    		ctx
    	});

    	return block;
    }

    // (39:2) {#each data.sections as section, index}
    function create_each_block_4(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_5,
    						({ hovering: active }) => ({ 16: active }),
    						({ hovering: active }) => active ? 65536 : 0
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

    			if (dirty & /*$$scope, active, c1i, current1, data, current2, c2i*/ 33619999) {
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
    		source: "(39:2) {#each data.sections as section, index}",
    		ctx
    	});

    	return block;
    }

    // (52:1) {#if current1 == 'keynotes' }
    function create_if_block_6(ctx) {
    	let div;
    	let current;
    	let each_value_3 = /*data*/ ctx[0].keynotes;
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

    			attr_dev(div, "class", "column2 svelte-7wx43s");
    			add_location(div, file, 52, 1, 1322);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active, c2i, current2, data*/ 65557) {
    				each_value_3 = /*data*/ ctx[0].keynotes;
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
    		source: "(52:1) {#if current1 == 'keynotes' }",
    		ctx
    	});

    	return block;
    }

    // (55:4) <Hoverable let:hovering={active}>
    function create_default_slot_4(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*keynote*/ ctx[21].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*keynote*/ ctx[21].text + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let a;
    	let t7;
    	let a_href_value;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[8](/*keynote*/ ctx[21], /*index*/ ctx[15]);
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
    			add_location(b, file, 57, 8, 1563);
    			add_location(br0, file, 57, 37, 1592);
    			add_location(small0, file, 58, 7, 1604);
    			add_location(br1, file, 58, 37, 1634);
    			attr_dev(a, "href", a_href_value = /*keynote*/ ctx[21].link);
    			add_location(a, file, 59, 14, 1653);
    			add_location(small1, file, 59, 7, 1646);
    			add_location(p, file, 56, 6, 1552);
    			attr_dev(div, "class", "card svelte-7wx43s");
    			toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
    			add_location(div, file, 55, 5, 1429);
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
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*keynote*/ ctx[21].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 1 && t4_value !== (t4_value = /*keynote*/ ctx[21].text + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = /*keynote*/ ctx[21].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*active, c2i*/ 65552) {
    				toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
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
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(55:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (54:2) {#each data.keynotes as keynote, index}
    function create_each_block_3(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_4,
    						({ hovering: active }) => ({ 16: active }),
    						({ hovering: active }) => active ? 65536 : 0
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

    			if (dirty & /*$$scope, active, c2i, current2, data*/ 33619989) {
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
    		source: "(54:2) {#each data.keynotes as keynote, index}",
    		ctx
    	});

    	return block;
    }

    // (68:1) {#if current1 == 'presentations' }
    function create_if_block_5(ctx) {
    	let div;
    	let current;
    	let each_value_2 = /*data*/ ctx[0].presentations;
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

    			attr_dev(div, "class", "column2 svelte-7wx43s");
    			add_location(div, file, 68, 1, 1805);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*active, c2i, current2, data*/ 65557) {
    				each_value_2 = /*data*/ ctx[0].presentations;
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
    		source: "(68:1) {#if current1 == 'presentations' }",
    		ctx
    	});

    	return block;
    }

    // (71:4) <Hoverable let:hovering={active}>
    function create_default_slot_3(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*pres*/ ctx[19].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*pres*/ ctx[19].presenter + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let a;
    	let t7;
    	let a_href_value;
    	let t8;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[9](/*pres*/ ctx[19], /*index*/ ctx[15]);
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
    			add_location(b, file, 72, 9, 2037);
    			add_location(br0, file, 72, 35, 2063);
    			add_location(small0, file, 73, 7, 2075);
    			add_location(br1, file, 73, 39, 2107);
    			attr_dev(a, "href", a_href_value = /*pres*/ ctx[19].link);
    			add_location(a, file, 74, 14, 2126);
    			add_location(small1, file, 74, 7, 2119);
    			add_location(p, file, 72, 6, 2034);
    			attr_dev(div, "class", "card svelte-7wx43s");
    			toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
    			add_location(div, file, 71, 5, 1914);
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
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*pres*/ ctx[19].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 1 && t4_value !== (t4_value = /*pres*/ ctx[19].presenter + "")) set_data_dev(t4, t4_value);

    			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = /*pres*/ ctx[19].link)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*active, c2i*/ 65552) {
    				toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
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
    		source: "(71:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (70:2) {#each data.presentations as pres, index}
    function create_each_block_2(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot_3,
    						({ hovering: active }) => ({ 16: active }),
    						({ hovering: active }) => active ? 65536 : 0
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

    			if (dirty & /*$$scope, active, c2i, current2, data*/ 33619989) {
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
    		source: "(70:2) {#each data.presentations as pres, index}",
    		ctx
    	});

    	return block;
    }

    // (83:1) {#if current1 == 'posters' }
    function create_if_block_3(ctx) {
    	let div;
    	let span;
    	let small0;
    	let b;
    	let t1;
    	let buttongroup;
    	let updating_value;
    	let t2;
    	let small1;
    	let t3;
    	let t4;
    	let t5;
    	let hr;
    	let t6;
    	let current;

    	function buttongroup_value_binding(value) {
    		/*buttongroup_value_binding*/ ctx[10](value);
    	}

    	let buttongroup_props = {
    		multiple: true,
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	if (/*tagSelection*/ ctx[5] !== void 0) {
    		buttongroup_props.value = /*tagSelection*/ ctx[5];
    	}

    	buttongroup = new ButtonGroup({ props: buttongroup_props, $$inline: true });
    	binding_callbacks.push(() => bind(buttongroup, 'value', buttongroup_value_binding));
    	let each_value = /*data*/ ctx[0].posters;
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
    			create_component(buttongroup.$$.fragment);
    			t2 = space();
    			small1 = element("small");
    			t3 = text("Current: ");
    			t4 = text(/*tagSelection*/ ctx[5]);
    			t5 = space();
    			hr = element("hr");
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(b, file, 85, 10, 2324);
    			add_location(small0, file, 85, 3, 2317);
    			attr_dev(span, "class", "tags svelte-7wx43s");
    			add_location(span, file, 84, 2, 2294);
    			add_location(small1, file, 95, 2, 2675);
    			set_style(hr, "color", "black");
    			add_location(hr, file, 96, 2, 2716);
    			attr_dev(div, "class", "column2 svelte-7wx43s");
    			add_location(div, file, 83, 1, 2270);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, small0);
    			append_dev(small0, b);
    			append_dev(span, t1);
    			mount_component(buttongroup, span, null);
    			append_dev(div, t2);
    			append_dev(div, small1);
    			append_dev(small1, t3);
    			append_dev(small1, t4);
    			append_dev(div, t5);
    			append_dev(div, hr);
    			append_dev(div, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const buttongroup_changes = {};

    			if (dirty & /*$$scope, data*/ 33554433) {
    				buttongroup_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*tagSelection*/ 32) {
    				updating_value = true;
    				buttongroup_changes.value = /*tagSelection*/ ctx[5];
    				add_flush_callback(() => updating_value = false);
    			}

    			buttongroup.$set(buttongroup_changes);
    			if (!current || dirty & /*tagSelection*/ 32) set_data_dev(t4, /*tagSelection*/ ctx[5]);

    			if (dirty & /*active, c2i, current2, data, tagSelection*/ 65589) {
    				each_value = /*data*/ ctx[0].posters;
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
    			transition_in(buttongroup.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(buttongroup.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(buttongroup);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(83:1) {#if current1 == 'posters' }",
    		ctx
    	});

    	return block;
    }

    // (89:4) <Button value={tag}>
    function create_default_slot_2(ctx) {
    	let t_value = /*tag*/ ctx[17] + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && t_value !== (t_value = /*tag*/ ctx[17] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(89:4) <Button value={tag}>",
    		ctx
    	});

    	return block;
    }

    // (88:3) {#each data.tags as tag, index}
    function create_each_block_1(ctx) {
    	let button;
    	let t;
    	let current;

    	button = new Button({
    			props: {
    				value: /*tag*/ ctx[17],
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(button.$$.fragment);
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const button_changes = {};
    			if (dirty & /*data*/ 1) button_changes.value = /*tag*/ ctx[17];

    			if (dirty & /*$$scope, data*/ 33554433) {
    				button_changes.$$scope = { dirty, ctx };
    			}

    			button.$set(button_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(88:3) {#each data.tags as tag, index}",
    		ctx
    	});

    	return block;
    }

    // (87:3) <ButtonGroup multiple bind:value={tagSelection}>
    function create_default_slot_1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*data*/ ctx[0].tags;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1) {
    				each_value_1 = /*data*/ ctx[0].tags;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
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
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(87:3) <ButtonGroup multiple bind:value={tagSelection}>",
    		ctx
    	});

    	return block;
    }

    // (99:3) {#if poster.tags.some(tag => tagSelection.includes(tag)) }
    function create_if_block_4(ctx) {
    	let hoverable;
    	let current;

    	hoverable = new Hoverable({
    			props: {
    				$$slots: {
    					default: [
    						create_default_slot,
    						({ hovering: active }) => ({ 16: active }),
    						({ hovering: active }) => active ? 65536 : 0
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

    			if (dirty & /*$$scope, active, c2i, current2, data*/ 33619989) {
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
    		source: "(99:3) {#if poster.tags.some(tag => tagSelection.includes(tag)) }",
    		ctx
    	});

    	return block;
    }

    // (100:4) <Hoverable let:hovering={active}>
    function create_default_slot(ctx) {
    	let div;
    	let p;
    	let b;
    	let t0_value = /*poster*/ ctx[13].title + "";
    	let t0;
    	let t1;
    	let t2;
    	let br0;
    	let t3;
    	let small0;
    	let t4_value = /*poster*/ ctx[13].contact + "";
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let small1;
    	let t7;
    	let t8_value = /*poster*/ ctx[13].tags + "";
    	let t8;
    	let t9;
    	let br2;
    	let t10;
    	let small2;
    	let a;
    	let t11;
    	let a_href_value;
    	let t12;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[11](/*poster*/ ctx[13], /*index*/ ctx[15]);
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
    			add_location(b, file, 102, 7, 3021);
    			add_location(br0, file, 102, 35, 3049);
    			add_location(small0, file, 103, 7, 3061);
    			add_location(br1, file, 103, 39, 3093);
    			add_location(small1, file, 104, 7, 3105);
    			add_location(br2, file, 104, 42, 3140);
    			attr_dev(a, "href", a_href_value = /*poster*/ ctx[13].teams);
    			add_location(a, file, 105, 14, 3159);
    			add_location(small2, file, 105, 7, 3152);
    			add_location(p, file, 101, 6, 3010);
    			attr_dev(div, "class", "card svelte-7wx43s");
    			toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
    			add_location(div, file, 100, 5, 2888);
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
    				dispose = listen_dev(div, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*data*/ 1 && t0_value !== (t0_value = /*poster*/ ctx[13].title + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*data*/ 1 && t4_value !== (t4_value = /*poster*/ ctx[13].contact + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*data*/ 1 && t8_value !== (t8_value = /*poster*/ ctx[13].tags + "")) set_data_dev(t8, t8_value);

    			if (dirty & /*data*/ 1 && a_href_value !== (a_href_value = /*poster*/ ctx[13].teams)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*active, c2i*/ 65552) {
    				toggle_class(div, "active", /*active*/ ctx[16] || /*c2i*/ ctx[4] == /*index*/ ctx[15]);
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
    		source: "(100:4) <Hoverable let:hovering={active}>",
    		ctx
    	});

    	return block;
    }

    // (98:2) {#each data.posters as poster, index}
    function create_each_block(ctx) {
    	let show_if = /*poster*/ ctx[13].tags.some(/*func*/ ctx[6]);
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
    			if (dirty & /*data, tagSelection*/ 33) show_if = /*poster*/ ctx[13].tags.some(/*func*/ ctx[6]);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*data, tagSelection*/ 33) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
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
    		source: "(98:2) {#each data.posters as poster, index}",
    		ctx
    	});

    	return block;
    }

    // (115:1) {#if current2 != 'foo' }
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let b;
    	let t0_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].title + "";
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
    	let t7_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].text + "";
    	let t7;
    	let if_block0 = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].contact && create_if_block_2(ctx);
    	let if_block1 = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].tags && create_if_block_1(ctx);

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
    			add_location(b, file, 117, 6, 3360);
    			add_location(br, file, 117, 41, 3395);
    			attr_dev(a, "href", a_href_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].teams);
    			add_location(a, file, 124, 11, 3620);
    			add_location(small0, file, 124, 4, 3613);
    			add_location(p, file, 117, 3, 3357);
    			add_location(small1, file, 126, 3, 3693);
    			attr_dev(div0, "class", "card svelte-7wx43s");
    			add_location(div0, file, 116, 2, 3334);
    			attr_dev(div1, "class", "column3 svelte-7wx43s");
    			add_location(div1, file, 115, 1, 3310);
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
    			if (dirty & /*data, current1, c2i*/ 19 && t0_value !== (t0_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].title + "")) set_data_dev(t0, t0_value);

    			if (/*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].contact) {
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

    			if (/*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].tags) {
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

    			if (dirty & /*data, current1, c2i*/ 19 && a_href_value !== (a_href_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].teams)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*data, current1, c2i*/ 19 && t7_value !== (t7_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].text + "")) set_data_dev(t7, t7_value);
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
    		source: "(115:1) {#if current2 != 'foo' }",
    		ctx
    	});

    	return block;
    }

    // (119:4) {#if data[current1][c2i].contact}
    function create_if_block_2(ctx) {
    	let small;
    	let t0_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].contact + "";
    	let t0;
    	let t1;
    	let br;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t0 = text(t0_value);
    			t1 = space();
    			br = element("br");
    			add_location(small, file, 119, 5, 3444);
    			add_location(br, file, 119, 50, 3489);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, current1, c2i*/ 19 && t0_value !== (t0_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].contact + "")) set_data_dev(t0, t0_value);
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
    		source: "(119:4) {#if data[current1][c2i].contact}",
    		ctx
    	});

    	return block;
    }

    // (122:4) {#if data[current1][c2i].tags}
    function create_if_block_1(ctx) {
    	let small;
    	let t0;
    	let t1_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].tags + "";
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
    			add_location(small, file, 122, 5, 3546);
    			add_location(br, file, 122, 53, 3594);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			append_dev(small, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data, current1, c2i*/ 19 && t1_value !== (t1_value = /*data*/ ctx[0][/*current1*/ ctx[1]][/*c2i*/ ctx[4]].tags + "")) set_data_dev(t1, t1_value);
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
    		source: "(122:4) {#if data[current1][c2i].tags}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let div0;
    	let a0;
    	let t0;
    	let a1;
    	let t1;
    	let a2;
    	let t2;
    	let a3;
    	let t3;
    	let span;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let t11;
    	let div1;
    	let h1;
    	let t12;
    	let br;
    	let t13;
    	let t14;
    	let div3;
    	let div2;
    	let t15;
    	let t16;
    	let t17;
    	let t18;
    	let t19;
    	let footer;
    	let t20;
    	let b;
    	let current;
    	let each_value_4 = /*data*/ ctx[0].sections;
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*current1*/ ctx[1] == 'keynotes' && create_if_block_6(ctx);
    	let if_block1 = /*current1*/ ctx[1] == 'presentations' && create_if_block_5(ctx);
    	let if_block2 = /*current1*/ ctx[1] == 'posters' && create_if_block_3(ctx);
    	let if_block3 = /*current2*/ ctx[2] != 'foo' && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			t0 = space();
    			a1 = element("a");
    			t1 = space();
    			a2 = element("a");
    			t2 = space();
    			a3 = element("a");
    			t3 = space();
    			span = element("span");
    			t4 = text(/*current1*/ ctx[1]);
    			t5 = text(", ");
    			t6 = text(/*c1i*/ ctx[3]);
    			t7 = text(", ");
    			t8 = text(/*current2*/ ctx[2]);
    			t9 = text(", ");
    			t10 = text(/*c2i*/ ctx[4]);
    			t11 = space();
    			div1 = element("div");
    			h1 = element("h1");
    			t12 = text("RISE Computer Science & AI ");
    			br = element("br");
    			t13 = text("\n\t\tOpen House, May 10, 2022");
    			t14 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t15 = space();
    			if (if_block0) if_block0.c();
    			t16 = space();
    			if (if_block1) if_block1.c();
    			t17 = space();
    			if (if_block2) if_block2.c();
    			t18 = space();
    			if (if_block3) if_block3.c();
    			t19 = space();
    			footer = element("footer");
    			t20 = text("© 2022 -\n\t");
    			b = element("b");
    			b.textContent = "RISE, Research Institutes of Sweden AB";
    			attr_dev(a0, "class", "active svelte-7wx43s");
    			attr_dev(a0, "href", "#home");
    			add_location(a0, file, 21, 1, 464);
    			attr_dev(a1, "href", "#news");
    			attr_dev(a1, "class", "svelte-7wx43s");
    			add_location(a1, file, 22, 1, 502);
    			attr_dev(a2, "href", "#contact");
    			attr_dev(a2, "class", "svelte-7wx43s");
    			add_location(a2, file, 23, 1, 525);
    			attr_dev(a3, "href", "#about");
    			attr_dev(a3, "class", "svelte-7wx43s");
    			add_location(a3, file, 24, 1, 551);
    			add_location(span, file, 25, 1, 575);
    			attr_dev(div0, "class", "topnav svelte-7wx43s");
    			add_location(div0, file, 20, 0, 442);
    			add_location(br, file, 30, 29, 688);
    			add_location(h1, file, 29, 1, 654);
    			attr_dev(div1, "class", "jumbo svelte-7wx43s");
    			add_location(div1, file, 28, 0, 633);
    			attr_dev(div2, "class", "column1 svelte-7wx43s");
    			add_location(div2, file, 37, 1, 766);
    			attr_dev(div3, "class", "grid-container svelte-7wx43s");
    			add_location(div3, file, 35, 0, 735);
    			add_location(b, file, 139, 1, 3949);
    			attr_dev(footer, "class", "text-center bg-dark text-muted svelte-7wx43s");
    			add_location(footer, file, 132, 0, 3768);
    			attr_dev(div4, "class", "main-page svelte-7wx43s");
    			add_location(div4, file, 18, 0, 417);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, a0);
    			append_dev(div0, t0);
    			append_dev(div0, a1);
    			append_dev(div0, t1);
    			append_dev(div0, a2);
    			append_dev(div0, t2);
    			append_dev(div0, a3);
    			append_dev(div0, t3);
    			append_dev(div0, span);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			append_dev(span, t6);
    			append_dev(span, t7);
    			append_dev(span, t8);
    			append_dev(span, t9);
    			append_dev(span, t10);
    			append_dev(div4, t11);
    			append_dev(div4, div1);
    			append_dev(div1, h1);
    			append_dev(h1, t12);
    			append_dev(h1, br);
    			append_dev(h1, t13);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div3, t15);
    			if (if_block0) if_block0.m(div3, null);
    			append_dev(div3, t16);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t17);
    			if (if_block2) if_block2.m(div3, null);
    			append_dev(div3, t18);
    			if (if_block3) if_block3.m(div3, null);
    			append_dev(div4, t19);
    			append_dev(div4, footer);
    			append_dev(footer, t20);
    			append_dev(footer, b);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*current1*/ 2) set_data_dev(t4, /*current1*/ ctx[1]);
    			if (!current || dirty & /*c1i*/ 8) set_data_dev(t6, /*c1i*/ ctx[3]);
    			if (!current || dirty & /*current2*/ 4) set_data_dev(t8, /*current2*/ ctx[2]);
    			if (!current || dirty & /*c2i*/ 16) set_data_dev(t10, /*c2i*/ ctx[4]);

    			if (dirty & /*active, c1i, current1, data, current2, c2i*/ 65567) {
    				each_value_4 = /*data*/ ctx[0].sections;
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

    			if (/*current1*/ ctx[1] == 'keynotes') {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*current1*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div3, t16);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*current1*/ ctx[1] == 'presentations') {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*current1*/ 2) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div3, t17);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*current1*/ ctx[1] == 'posters') {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*current1*/ 2) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div3, t18);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*current2*/ ctx[2] != 'foo') {
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
    			if (detaching) detach_dev(div4);
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
    	data.posters = posters.posters;
    	let current1 = 'keynotes';
    	let current2 = 'foo';
    	let c1i = 0;
    	let c2i = -1;
    	let selectedTag = "data";
    	let tagSelection = JSON.parse(JSON.stringify(data.tags));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const func = tag => tagSelection.includes(tag);

    	const click_handler = (section, index) => {
    		$$invalidate(1, current1 = section.title);
    		$$invalidate(3, c1i = index);
    		$$invalidate(2, current2 = 'foo');
    		$$invalidate(4, c2i = -1);
    	};

    	const click_handler_1 = (keynote, index) => {
    		$$invalidate(2, current2 = keynote.title);
    		$$invalidate(4, c2i = index);
    	};

    	const click_handler_2 = (pres, index) => {
    		$$invalidate(2, current2 = pres.title);
    		$$invalidate(4, c2i = index);
    	};

    	function buttongroup_value_binding(value) {
    		tagSelection = value;
    		$$invalidate(5, tagSelection);
    	}

    	const click_handler_3 = (poster, index) => {
    		$$invalidate(2, current2 = poster.title);
    		$$invalidate(4, c2i = index);
    	};

    	$$self.$capture_state = () => ({
    		Hoverable,
    		Button,
    		ButtonGroup,
    		data,
    		posters,
    		current1,
    		current2,
    		c1i,
    		c2i,
    		selectedTag,
    		tagSelection
    	});

    	$$self.$inject_state = $$props => {
    		if ('current1' in $$props) $$invalidate(1, current1 = $$props.current1);
    		if ('current2' in $$props) $$invalidate(2, current2 = $$props.current2);
    		if ('c1i' in $$props) $$invalidate(3, c1i = $$props.c1i);
    		if ('c2i' in $$props) $$invalidate(4, c2i = $$props.c2i);
    		if ('selectedTag' in $$props) selectedTag = $$props.selectedTag;
    		if ('tagSelection' in $$props) $$invalidate(5, tagSelection = $$props.tagSelection);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		data,
    		current1,
    		current2,
    		c1i,
    		c2i,
    		tagSelection,
    		func,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		buttongroup_value_binding,
    		click_handler_3
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
