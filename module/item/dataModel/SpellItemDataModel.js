import { SpellData } from '../fields/SpellField';
/**
 * Data model for a spell item.
 */
export class SpellItemDataModel extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return SpellData.defineSchema();
    }
    /** @override */
    prepareBaseData() {
        super.prepareBaseData();
        this.spellLevel = this.spellLevel !== null ? Math.max(0, this.spellLevel) : 1;
    }
    /** @override */
    prepareDerivedData() {
        super.prepareDerivedData();
        this.savingThrow = this.savingThrow === '' ? null : this.savingThrow;
    }
}
