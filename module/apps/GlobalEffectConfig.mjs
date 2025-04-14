class GlobalEffectConfig extends ActiveEffectConfig {
  getData() {
    const data = super.getData();
    
    // Remove parent-related data or adjust
    data.object.parent = null;  // Since it's global, there's no parent
    return data;
  }

  async _updateObject(event, formData) {
    // Instead of interacting with parent, update global effects
    let globalEffects = game.settings.get(game.system.id, 'globalEffects');
    const effectId = this.object.id;
    const effectIndex = globalEffects.findIndex(e => e.id === effectId);

    if (effectIndex !== -1) {
      globalEffects[effectIndex] = mergeObject(globalEffects[effectIndex], formData);
      game.settings.set(game.system.id, 'globalEffects', globalEffects);
      ui.notifications.info('Global effect updated.');
    }
  }
}
