import { fadeDialog } from './Dialog.mjs';

export const DialogFactory = (dataset, caller = null, opt = {}) => {
   const { dialog } = dataset;
   let result;
   if (dialog === 'ability') {
      result = fadeDialog.getAbilityDialog(dataset, caller);
   } else if (dialog === 'generic') {
      result = fadeDialog.getGenericDialog(dataset, caller);
   }
   return result;
};
