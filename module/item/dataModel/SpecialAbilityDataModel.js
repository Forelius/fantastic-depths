import { SpecialAbilityData } from '../fields/SpecialAbilityField.js';
/**
 * Data model for a special ability item.
 */
export class SpecialAbilityDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return SpecialAbilityData.defineSchema();
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
    }
    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
    }
}
