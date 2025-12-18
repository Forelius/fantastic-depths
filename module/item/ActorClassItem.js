import { FDItem } from './FDItem';
export class ActorClassItem extends FDItem {
    /**
     * @param {any} updateData
     * @param {any} options
     * @param {any} userId
     */
    _onUpdate(updateData, options, userId) {
        super._onUpdate(updateData, options, userId);
        this.updatePropertiesFromUpdate(updateData);
    }
    //** Update item properties based on FADE.WeaponMastery */
    async updatePropertiesFromUpdate(updateData) {
        if (this.id && this.actor) {
            const classSystem = game.fade.registry.getSystem("classSystem");
            await classSystem.onActorItemUpdate(this.actor, this, updateData);
        }
    }
    async getInlineDescription() {
        return '--';
    }
}
