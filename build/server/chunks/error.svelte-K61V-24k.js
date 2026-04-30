import { c as create_ssr_component, a as subscribe, g as getContext } from './ssr-CveG98s7.js';
import { o as onMount } from './ssr2-DH0Db1X5.js';
import { e as escape } from './escape-CEcUr6mr.js';

const is_legacy = onMount.toString().includes("$$") || /function \w+\(\) \{\}/.test(onMount.toString());
const placeholder_url = "a:";
if (is_legacy) {
  ({
    url: new URL(placeholder_url)
  });
}
const getStores = () => {
  const stores = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
const Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<h1>${escape($page.status)}</h1> <p>${escape($page.error?.message)}</p>`;
});

export { Error$1 as default };
//# sourceMappingURL=error.svelte-K61V-24k.js.map
