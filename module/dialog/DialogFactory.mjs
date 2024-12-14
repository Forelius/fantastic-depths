import { fadeDialog } from './fadeDialog.mjs';

/**
 * Create a type of dialog to be used.
 * @param {any} dataset Requires that dataset.dialog be set.
 * @param {any} caller For attack dialog this is the item.
 * @param {any} opt
 * @returns
 */
export const DialogFactory = (dataset=null, caller = null, opt = {}) => {
   let result;
   if (dataset.dialog === 'ability') {
      result = fadeDialog.getAbilityDialog(dataset, caller);
   } else if (dataset.dialog === 'generic') {
      result = fadeDialog.getGenericDialog(dataset, caller);
   } else if (dataset.dialog === 'attack') {
      result = fadeDialog.getAttackDialog(opt.weapon, caller, opt);
   } else if (dataset.dialog === 'spellattack') {
      result = fadeDialog.getSpellAttackDialog(dataset, caller, opt);
   } else if (dataset.dialog === 'lightmgr') {
      result = fadeDialog.getLightMgrDialog(dataset, caller, opt);
   } else if (dataset.dialog === 'yesno') {
      result = fadeDialog.getYesNoDialog(dataset);
   }
   return result;
};
