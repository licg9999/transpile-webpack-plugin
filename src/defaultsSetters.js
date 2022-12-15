// Copied from:
// https://github.com/webpack/webpack/blob/4b4ca3bb53f36a5b8fc6bc1bd976ed7af161bd80/lib/config/defaults.js#L47-L114

/**
 * Sets a constant default value when undefined
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {T[P]} value a default value of the property
 * @returns {void}
 */
const D = (obj, prop, value) => {
  if (obj[prop] === undefined) {
    obj[prop] = value;
  }
};

/**
 * Sets a dynamic default value when undefined, by calling the factory function
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {function(): T[P]} factory a default value factory for the property
 * @returns {void}
 */
const F = (obj, prop, factory) => {
  if (obj[prop] === undefined) {
    obj[prop] = factory();
  }
};

/**
 * Sets a dynamic default value when undefined, by calling the factory function.
 * factory must return an array or undefined
 * When the current value is already an array an contains "..." it's replaced with
 * the result of the factory function
 * @template T
 * @template {keyof T} P
 * @param {T} obj an object
 * @param {P} prop a property of this object
 * @param {function(): T[P]} factory a default value factory for the property
 * @returns {void}
 */
const A = (obj, prop, factory) => {
  const value = obj[prop];
  if (value === undefined) {
    obj[prop] = factory();
  } else if (Array.isArray(value)) {
    /** @type {any[]} */
    let newArray = undefined;
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item === '...') {
        if (newArray === undefined) {
          newArray = value.slice(0, i);
          obj[prop] = /** @type {T[P]} */ (/** @type {unknown} */ (newArray));
        }
        const items = /** @type {any[]} */ (/** @type {unknown} */ (factory()));
        if (items !== undefined) {
          for (const item of items) {
            newArray.push(item);
          }
        }
      } else if (newArray !== undefined) {
        newArray.push(item);
      }
    }
  }
};

export { D, F, A };
