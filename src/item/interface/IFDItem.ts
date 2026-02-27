/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatAction } from "../type/ChatAction.js"

/** An experiment. Probably remove later. */
export interface IFDItem {
   get ownerToken();

   /** A getter for dynamically calculating the contained items.
    * This data is not stored in the database. */
   get containedItems();
   /** Returns true if this item type shows selected targets on its chat card, otherwise false. */
   get hasTargets(): boolean;
   /** A different way to say melee attack for items that aren't ranged, but also not melee (siege weapons). */
   get canAttack(): boolean;
   get canMelee(): boolean;
   get canShoot(): boolean;
   get canThrow(): boolean;
   /** Returns true if the item uses charges and either there are charges remaining or there are infinite charges (chargesMax === null). */
   get hasCharge(): boolean;
   /** Returns true if the item uses quantity and either there are uses remaining or there are infinite uses (quantityMax === null). */
   get hasUse(): boolean;
   /** Returns true if this item either has available casts or has infinite casts, otherwise false. */
   get hasCast(): boolean;
   /** The name of the item as known by the players. */
   get knownName();
   /** The name of the item as known by the players or user is GM. */
   get knownNameGM();
   /** If object needs is identifiable then the unidentified name, otherwise the name. */
   get unknownName();
   get knownDescription();
   get knownDescriptionGM();
   get isIdentified(): boolean;

   /** @protected */
   prepareBaseData();

   /**
    * Prepare a data object which defines the data schema used by dice roll commands against this Item
    */
   getRollData();

   getInlineDescription(): Promise<any>;

   getActionsForChat(_owner?, _options?): ChatAction[];

   /**
    * Handle clickable rolls. This is the default handler and subclasses override. If a subclass 
    * does not override this message the result is a chat message with the item description.
    * @public
    * @param {any} dataset The data- tag values from the clicked element
    */
   roll(dataset): Promise<void>;

   /**
    * Evaluates a roll formula asynchronously into a numerical value.
    * @param {any} formula The roll formula
    * @param {any} options The Roll.evaluate options. Default minimize=true will generate lowest possible value.
    * @returns {Promise<any>} If the formula and options are valid, an evaluated roll object.
    */
   getEvaluatedRoll(formula, options): Promise<any>;

   /**
    * Evaluates a roll formula synchronously into a numerical value.
    * @param {string} formula The roll formula
    * @param {any} options The Roll.evaluate options. Default minimize=true will generate lowest possible value.
    * @returns If the formula and options are valid, an evaluated roll object.
    */
   getEvaluatedRollSync(formula: string, options);

   getInstigator(dataset): Promise<any>;

   /**
    * Determines if a roll on an item should show a success/fail result message.
    * @protected
    * @param {any} event
    * @returns True if the results should be shown, otherwise false.
    */
   getShowResult(event): boolean;
}