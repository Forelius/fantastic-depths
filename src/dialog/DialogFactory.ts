import { fadeDialog } from "./fadeDialog";
import { AttackDialog } from "./AttackDialog"
import { SavingThrowDialog } from "./SavingThrowDialog"
import { AbilityCheckDialog } from "./AbilityCheckDialog"
import { LightMgrDialog } from "./LightMgrDialog"
import { WrestlingDialog } from "./WrestlingDialog"
import { DamageTypeDialog } from "./DamageTypeDialog"
/**
 * Create a type of dialog to be used.
 * @param {any} dataset Requires that dataset.dialog be set.
 * @param {any} caller For attack dialog this is the item.
 * @param {any} options
 * @returns
 */
export const DialogFactory = async (dataset = null, caller = null, options: any = { dataset: null, weapon: null, targetToken: null }) => {
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
