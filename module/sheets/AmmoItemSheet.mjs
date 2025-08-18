import { GearItemSheet } from './GearItemSheet.mjs';
import { VsGroupModMixin } from './mixins/VsGroupModMixin.mjs';

/**
 * Sheet class for AmmoItem.
 */
export class AmmoItemSheet extends VsGroupModMixin(GearItemSheet) {
   /**
   * Get the default options for the sheet.
   */
   static DEFAULT_OPTIONS = {
      position: {
         width: 570,
         height: 400,
      },
      window: {
         resizable: true,
         minimizable: false,
         contentClasses: ["scroll-body"]
      },
      classes: ['fantastic-depths', 'sheet', 'item'],
      form: {
         submitOnChange: true
      }
   }

   static PARTS = {
      header: {
         template: "systems/fantastic-depths/templates/item/ammo/header.hbs",
      },
      tabnav: {
         template: "templates/generic/tab-navigation.hbs",
      },
      description: {
         template: "systems/fantastic-depths/templates/item/shared/description.hbs",
      },
      attributes: {
         template: "systems/fantastic-depths/templates/item/ammo/attributes.hbs",
      },
      effects: {
         template: "systems/fantastic-depths/templates/item/shared/effects.hbs",
      },
      gmOnly: {
         template: "systems/fantastic-depths/templates/item/shared/gmOnlyCharge.hbs",
      }
   }

   /** @override */
   tabGroups = {
      primary: "description"
   }
}