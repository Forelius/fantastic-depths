import { UserTablesConfig } from "/systems/fantastic-depths/module/apps/UserTablesConfig.mjs"

export class UserTables {
   static TABLE_TYPES = ["bonus", "keyvalue", "keyjson", "jsonarray"];

   constructor() {
      this.userTables = {};
      this.#loadTables();
      this.#tryAddDefaultTables();
   }

   getTables() {
      return foundry.utils.deepClone(this.userTables);
   }

   setTable({ id, name, type, table } = data) {
      if (Array.isArray(table) === false) {
         console.error(`addTable ${name} table is not an array.`);
         return;
      }

      if (type === "bonus") {
         for (let row of table) {
            if (row.min === null || row.min === undefined || row.bonus === null || row.bonus === undefined) {
               console.error(`addTable ${name} is not a valid bonus table. Requires properties: min, bonus`);
               return;
            }
         }
      } else if (type === "keyvalue") {
         for (let row of table) {
            if (row.key === null || row.key === undefined || row.value === null || row.value === undefined) {
               console.error(`addTable ${name} is not a valid key/value table. Requires properties: key, value`);
               return;
            }
         }
      } else if (type === "keyjson") {
         for (let row of table) {
            if (row.key === null || row.key === undefined || row.json === null || row.json === undefined) {
               console.error(`addTable ${name} is not a valid key/json table. Requires properties: key, json`);
               return;
            }
         }
      } else if (type === "jsonarray") {
         for (let row of table) {
            if (row.json === null || row.json === undefined) {
               console.error(`addTable ${name} is not a valid json array table. Requires properties: json`);
               return;
            }
         }
      }

      this.userTables[id] = { id, name, type, table };
      game.settings.set(game.system.id, 'userTables', this.userTables);
   }

   removeTable(id) {
      if (this.userTables[id]) {
         delete this.userTables[id];
         game.settings.set(game.system.id, 'userTables', this.userTables);
         console.log(`Deleted user table ${id}.`);
      }
   }

   getTable(id) {
      return this.userTables[id];
   }

   /**
    * Get a numneric value for the specified bonus minimum from a bonus type table.
    * @param {any} id The id of the table.
    * @param {any} value The value to compare against the bonus table's min property.
    * @returns A numeric value.
    */
   getBonus(id, value) {
      let result = null;
      if (this.getTable(id)?.type === "bonus") {
         const table = this.getTable(id)?.table;
         result = table?.filter(row => row.min <= value)
            .reduce((prev, current) => prev.min > current.min ? prev : current, { min: 0, bonus: 0 });
      } else {
         console.warn(`Bonus user table ${id} does not exist.`);
      }
      return result?.bonus ?? 0;
   }

   /**
    * Get a numeric value for the specified key from a keyvalue type table.
    * @param {any} id The id of the table.
    * @param {any} key The key for the requested value
    * @returns A numeric value if the key exists, otherwise null.
    */
   getKeyValue(id, key) {
      let result = null;
      if (this.getTable(id)?.type === "keyvalue") {
         const table = this.getTable(id)?.table;
         result = table?.find(row => row.key === key);
      } else {
         console.warn(`User table ${id} does not exist or does not support getKeyValue.`);
      }
      return result?.value;
   }

   /**
    * Get a json object from a keyvalue type table.
    * @param {any} id The id of the table.
    * @returns A JSON object with a property for every key value. Each value is a numeric.
    */
   getKeyValuesJson(id) {
      let result = null;
      if (this.getTable(id)?.type === "keyvalue") {
         let table = this.getTable(id)?.table;
         result = table?.reduce((acc, item) => { acc[item.key] = Number(item.value); return acc; }, {});
      } else {
         console.warn(`User table ${id} does not exist or does not support getKeyValuesObject.`);
      }
      return result;
   }

   /**
    * Get a numeric/string/json object from a keyjson type table.
    * @param {any} id The id of the table.
    * @returns A numeric, string or json object with a property for every key.
    */
   getKeyJson(id) {
      let result = null;
      if (this.getTable(id)?.type === "keyjson") {
         let table = this.getTable(id)?.table;
         result = table?.reduce((acc, item) => { acc[item.key] = this.convertJsonToObject(item); return acc; }, {});
      } else {
         console.warn(`User table ${id} does not exist or does not support getKeyJson.`);
      }
      return result;
   }

   /**
    * Get the array of json objects from a jsonarray type table.
    * @param {any} id
    */
   getJsonArray(id) {
      let result = null;
      if (this.getTable(id)?.type === "jsonarray") {
         let table = this.getTable(id)?.table;
         result = table?.map(this.convertJsonToObject);
      } else {
         console.warn(`User table ${id} does not exist or does not support getJsonArray.`);
      }
      return result;
   }

   convertJsonToObject(item) {
      let value = Number(item.json);
      if (isNaN(value)) {
         try { value = JSON.parse(item.json); } catch (error) { }
      }
      return value ?? item.json;
   }

   displayForm() {
      UserTablesConfig.displayForm();
   }

   #tryAddDefaultTables() {
      // Ranged Modifiers
      if (this.userTables["ranged-modifiers"] === undefined) {
         this.userTables["ranged-modifiers"] = {
            id: "ranged-modifiers",
            name: "Ranged Modifiers",
            type: "keyvalue",
            table: [
               { key: "short", value: 1 },
               { key: "medium", value: 0 },
               { key: "long", value: -1 }
            ]
         };
      }
      // Ability Score Modifiers - Simple
      if (this.userTables["ability-mods-simple"] === undefined) {
         this.userTables["ability-mods-simple"] = {
            id: "ability-mods-simple",
            name: "Ability Modifiers - Simple",
            type: "jsonarray",
            table: [
               { json: `{ "min": 0, "value": -1, "maxRetainers": 3, "retainerMorale": 6 }` },
               { json: `{ "min": 7, "value": 0, "reaction": 0, "maxRetainers": 4, "retainerMorale": 7 }` },
               { json: `{ "min": 15, "value": 1, "reaction": 1, "maxRetainers": 5, "retainerMorale": 8 }` },
            ]
         };
      }
      // Ability Score Modifiers - Heroic
      if (this.userTables["ability-mods-heroic"] === undefined) {
         this.userTables["ability-mods-heroic"] = {
            id: "ability-mods-heroic",
            name: "Ability Modifiers - Heroic",
            type: "jsonarray",
            table: [
               { json: `{ "min": 0, "value": -5, "maxRetainers": 0, "retainerMorale": 0 }` },
               { json: `{ "min": 1, "value": -4, "reaction": -3, "maxRetainers": 1, "retainerMorale": 3 }` },
               { json: `{ "min": 2, "value": -3, "reaction": -2, "maxRetainers": 1, "retainerMorale": 4 }` },
               { json: `{ "min": 4, "value": -2, "reaction": -1, "maxRetainers": 2, "retainerMorale": 5 }` },
               { json: `{ "min": 6, "value": -1, "reaction": -1, "maxRetainers": 3, "retainerMorale": 6 }` },
               { json: `{ "min": 9, "value": 0, "reaction": 0, "maxRetainers": 4, "retainerMorale": 7 }` },
               { json: `{ "min": 13, "value": 1, "reaction": 1, "maxRetainers": 5, "retainerMorale": 8 }` },
               { json: `{ "min": 16, "value": 2, "reaction": 1, "maxRetainers": 6, "retainerMorale": 9 }` },
               { json: `{ "min": 18, "value": 3, "reaction": 2, "maxRetainers": 7, "retainerMorale": 10 }` },
               { json: `{ "min": 19, "value": 4, "reaction": 2, "maxRetainers": 8, "retainerMorale": 11 }` },
               { json: `{ "min": 21, "value": 5, "reaction": 3, "maxRetainers": 9, "retainerMorale": 12 }` },
               { json: `{ "min": 24, "value": 6, "reaction": 3, "maxRetainers": 10, "retainerMorale": 13 }` },
               { json: `{ "min": 28, "value": 7, "reaction": 4, "maxRetainers": 11, "retainerMorale": 14 }` },
               { json: `{ "min": 33, "value": 8, "reaction": 4, "maxRetainers": 12, "retainerMorale": 15 }` },
               { json: `{ "min": 39, "value": 9, "reaction": 5, "maxRetainers": 13, "retainerMorale": 16 }` },
               { json: `{ "min": 46, "value": 10, "reaction": 5, "maxRetainers": 14, "retainerMorale": 17 }` },
               { json: `{ "min": 54, "value": 11, "reaction": 6, "maxRetainers": 15, "retainerMorale": 18 }` },
               { json: `{ "min": 63, "value": 12, "reaction": 6, "maxRetainers": 16, "retainerMorale": 19 }` },
               { json: `{ "min": 71, "value": 13, "reaction": 7, "maxRetainers": 17, "retainerMorale": 20 }` },
               { json: `{ "min": 78, "value": 14, "reaction": 7, "maxRetainers": 18, "retainerMorale": 21 }` },
               { json: `{ "min": 84, "value": 15, "reaction": 8, "maxRetainers": 19, "retainerMorale": 22 }` },
               { json: `{ "min": 89, "value": 16, "reaction": 8, "maxRetainers": 20, "retainerMorale": 23 }` },
               { json: `{ "min": 94, "value": 17, "reaction": 9, "maxRetainers": 21, "retainerMorale": 24 }` },
               { json: `{ "min": 97, "value": 18, "reaction": 9, "maxRetainers": 22, "retainerMorale": 25 }` },
               { json: `{ "min": 99, "value": 19, "reaction": 10, "maxRetainers": 23, "retainerMorale": 26 }` },
               { json: `{ "min": 100, "value": 20, "reaction": 10, "maxRetainers": 24, "retainerMorale": 27 }` }
            ]
         };
      }
      if (this.userTables["difficulty-levels"] === undefined) {
         this.userTables["difficulty-levels"] = {
            id: "difficulty-levels",
            name: "Difficulty Levels",
            type: "keyvalue",
            table: [
               { key: "easy", value: -4 },
               { key: "medium", value: 0 },
               { key: "hard", value: 4 },
               { key: "veryHard", value: 8 },
               { key: "absurd", value: 12 }
            ]
         };
      }
      if (this.userTables["tiered-results"] === undefined) {
         this.userTables["tiered-results"] = {
            id: "tiered-results",
            name: "Tiered Results",
            type: "keyvalue",
            table: [
               { key: "criticalFail", value: 5 },
               { key: "fail", value: 1 },
               { key: "partialSuccess", value: 0 },
               { key: "success", value: -4 },
               { key: "criticalSuccess", value: -5 }
            ]
         };
      }
   }

   #loadTables() {
      this.userTables = game.settings.get(game.system.id, 'userTables') ?? {};
   }
}
/*
game.fade.registry.getSystem("userTables").addTable('dwarf-resiliance', 'Dwarf Resiliance', "bonus", [
    {min:0, bonus:0},
    {min:7, bonus:2},
    {min:11, bonus:3},
    {min:15, bonus:4},
    {min:18, bonus:5},
]);
game.fade.registry.getSystem("userTables").getBonus("dwarf-resiliance", 7);
eval('game.fade.registry.getSystem("userTables").getBonus("dwarf-resiliance", 7)');
*/