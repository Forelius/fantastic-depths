import { UserTablesConfig } from "/systems/fantastic-depths/module/apps/UserTablesConfig.mjs"

export class UserTables {
   static TABLE_TYPES = ["bonus","keyvalue"];

   constructor() {
      this.userTables = {};
      this.#loadTables();
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

   getBonus(id, value) {
      const table = this.getTable(id)?.table;
      const bestRow = table?.filter(row => row.min <= value)
         .reduce((prev, current) => prev.min > current.min ? prev : current, { min: 0, bonus: 0 });
      return bestRow?.bonus ?? 0;
   }

   #loadTables() {
      this.userTables = game.settings.get(game.system.id, 'userTables') ?? {};
   }

   displayForm() {
      UserTablesConfig.displayForm();
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