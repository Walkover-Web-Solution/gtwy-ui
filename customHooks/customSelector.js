import { useSelector } from "react-redux";

/**
 * Compares two values for deep equality.
 *
 * @param {any} oldValue The first value to compare
 * @param {any} newValue The second value to compare
 * @returns {boolean} True if the values are equal, false otherwise
 */
export default function isEqual(oldValue, newValue) {
  // If the values are strictly equal (same type and same value), return true
  if (oldValue === newValue) return true;

  // If either value is null or undefined, return false
  if (oldValue === null || oldValue === undefined || newValue === null || newValue === undefined) {
    return false;
  }

  // If the types of the values are different, return false
  const typeOfOldValue = typeof oldValue;
  const typeOfNewValue = typeof newValue;
  if (typeOfOldValue !== typeOfNewValue) return false;

  // If the values are objects, compare each key
  if (typeOfOldValue === "object") {
    // If the number of keys is different, return false
    const keys1 = Object.keys(oldValue);
    const keys2 = Object.keys(newValue);
    if (keys1.length !== keys2.length) return false;

    // For each key, compare the values
    return keys1.every((key) => isEqual(oldValue[key], newValue[key]));
  }

  // If the values are arrays, compare each item
  if (Array.isArray(oldValue)) {
    // If the lengths are different, return false
    if (!Array.isArray(newValue) || oldValue.length !== newValue.length) return false;

    // For each item, compare the values
    return oldValue.every((item, index) => isEqual(item, newValue[index]));
  }

  // If none of the above conditions are met, return false
  return false;
}

/**
 * A custom useSelector hook that uses a deep equality comparison
 * to determine whether the component should re-render.
 *
 * @param {Function} stateChangesKaFuntion A function that takes the state as an argument
 * and returns the part of the state that the component is interested in.
 *
 * @returns {any} The part of the state that is returned by the stateChangesKaFuntion
 */
export const useCustomSelector = (stateChangesKaFuntion) => {
  /**
   * The data returned by the stateChangesKaFuntion
   * @type {any}
   */
  const data = useSelector(stateChangesKaFuntion, isEqual);

  // Return the data
  return data;
};
