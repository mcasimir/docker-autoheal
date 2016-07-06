const SINGLETON_NS = `__singleton__${__dirname}`;

global[SINGLETON_NS] = global[SINGLETON_NS] || {};
let singletons = global[SINGLETON_NS];

export default function singleton(name, definition) {
  if (!(name in singletons)) {
    singletons[name] = definition();
  }
  return singletons[name];
}
