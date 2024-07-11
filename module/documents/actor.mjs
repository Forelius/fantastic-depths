/** 
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class fadeActor extends Actor {
  /** @override */
  async _preCreate(data, options, userId) {
    const allowed = await super._preCreate(data, options, userId);

    const changeData = {};

    switch (this.type) {
      case "character":
        Object.assign(changeData, {
          "prototypeToken.sight": {
            "enabled": true,
            "visonMode": "basic",
          },
          "prototypeToken.disposition": CONST.TOKEN_DISPOSITIONS.FRIENDLY,
          "prototypeToken.actorLink": true,
        });
        break;
      case "monster":
        break;
      case "npc":
        break;
    }

    await this.updateSource(changeData);

    return allowed;
  }

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in templates.
   */
  prepareDerivedData() {
    const actorData = this;
    const data = actorData.system;

    // Initialize attributes if missing
    data.attributes = data.attributes || {};

    // Prepare each Actor type (character, npc, etc.) to keep things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // Initialize abilities if missing
    systemData.abilities = systemData.abilities || {};

    // Ensure all abilities have default values if missing
    const abilities = ["str", "dex", "con", "int", "wis", "cha"];
    abilities.forEach(ability => {
      systemData.abilities[ability] = systemData.abilities[ability] || { value: 10 };
    });

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      ability.mod = Math.floor((ability.value - 10) / 2);
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Ensure attributes are initialized
    data.attributes = data.attributes || {};

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    data.lvl = data.attributes.level?.value || 0;
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }
}
