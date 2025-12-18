import { FDItem } from "./FDItem";
/**
 * MasteryDefinitionItem class that extends the base FDItem class.
 */
export class MasteryDefinitionItem extends FDItem {
    async createActorWeaponMastery(owner) {
        const result = await FDItem.create({
            name: this.name,
            type: "mastery",
        }, { parent: owner });
        return result;
    }
}
