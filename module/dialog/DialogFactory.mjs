import { fadeDialog } from './Dialog.mjs';

/**
 * Create a type of dialog to be used.
 * @param {any} dataset
 * @param {any} caller For attack dialog this is the item.
 * @param {any} opt
 * @returns
 */
export const DialogFactory = (dataset, caller = null, opt = {}) => {
   let result;
   if (dataset.dialog === 'ability') {
      result = fadeDialog.getAbilityDialog(dataset, caller);
   } else if (dataset.dialog === 'generic') {
      result = fadeDialog.getGenericDialog(dataset, caller);
   } else if (dataset.dialog === 'attack') {
      result = fadeDialog.getAttackDialog(dataset, caller, opt.weapon);
   }
   return result;
};
