import { fadeDialog } from './fadeDialog.mjs';
import { AttackDialog } from './AttackDialog.mjs'
import { SavingThrowDialog } from './SavingThrowDialog.mjs'
import { AbilityCheckDialog } from './AbilityCheckDialog.mjs'
import { LightMgrDialog } from './LightMgrDialog.mjs'

/**
 * Create a type of dialog to be used.
 * @param {any} dataset Requires that dataset.dialog be set.
 * @param {any} caller For attack dialog this is the item.
 * @param {any} opt
 * @returns
 */
export const DialogFactory = (dataset = null, caller = null, opt = {}) => {
   let result;
   if (dataset.dialog === 'ability') {
      result = AbilityCheckDialog.getDialog(dataset, caller);
   } else if (dataset.dialog === 'generic') {
      result = fadeDialog.getGenericDialog(dataset, caller);
   } else if (dataset.dialog === 'attack') {
      result = AttackDialog.getDialog(opt.weapon, caller, opt);
   } else if (dataset.dialog === 'lightmgr') {
      result = LightMgrDialog.getDialog(dataset, caller, opt);
   } else if (dataset.dialog === 'yesno') {
      result = fadeDialog.getYesNoDialog(dataset);
   } else if (dataset.dialog === 'save') {
      result = SavingThrowDialog.getDialog(dataset, caller);
   } 
   return result;
};
