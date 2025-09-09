import { fadeDialog } from "./fadeDialog.mjs";
import { AttackDialog } from "./AttackDialog.mjs"
import { SavingThrowDialog } from "./SavingThrowDialog.mjs"
import { AbilityCheckDialog } from "./AbilityCheckDialog.mjs"
import { LightMgrDialog } from "./LightMgrDialog.mjs"
import { WrestlingDialog } from "./WrestlingDialog.mjs"
import { DamageTypeDialog } from "./DamageTypeDialog.mjs"
/**
 * Create a type of dialog to be used.
 * @param {any} dataset Requires that dataset.dialog be set.
 * @param {any} caller For attack dialog this is the item.
 * @param {any} options
 * @returns
 */
export const DialogFactory = async (dataset = null, caller = null, options = {}) => {
   let result;
   if (dataset.dialog === "ability") {
      result = await AbilityCheckDialog.getDialog(dataset, caller);
   } else if (dataset.dialog === "generic") {
      result = await fadeDialog.getGenericDialog(dataset, caller);
   } else if (dataset.dialog === "attack") {
      result = await AttackDialog.getDialog(options.weapon, caller, options);
   } else if (dataset.dialog === "lightmgr") {
      result = await LightMgrDialog.getDialog(dataset, caller, options);
   } else if (dataset.dialog === "yesno") {
      result = await fadeDialog.getYesNoDialog(dataset);
   } else if (dataset.dialog === "save") {
      result = await SavingThrowDialog.getDialog(dataset, caller);
   } else if (dataset.dialog === "wrestling") {
      result = await WrestlingDialog.getDialog(dataset, caller, options);
   } else if (dataset.dialog === "damageType") {
      result = await DamageTypeDialog.getDialog(dataset, caller, options);
   }
   return result;
};