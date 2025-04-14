export class UserTables {
   constructor() {
      this.tableTypes = ["bonus"];
      this.userTables = {};
      this.#loadTables();
   }
      
   addTable(tableName, type, table) {
      if (Array.isArray(table) === false){
         console.error(`addTable ${tableName} table is not an array.`);
         return;
      }

      if (type === "bonus") {         
         for (let row of table){
            if (row.min === null || row.min===undefined || row.bonus === null || row.bonus === undefined){
               console.error(`addTable ${tableName} is not a valid bonus table. Requires properties: min, bonus`);
               return;
            }
         }
      }

      this.userTables[tableName] = { type, table };
      game.settings.set(game.system.id, 'userTables', this.userTables);
   }

   removeTable(tableName) {
      if (this.userTables[tableName]) {
         delete this.userTables[tableName];
      }
   }

   getTable(tableName) {
      return this.userTables[tableName];
   }

   getTableType(tableName) { 
      return this.userTables[tableName]?.type;
   }

   getBonus(tableName, value) {
      const table = this.getTable(tableName)?.table;
      const bestRow = table?.filter(row => row.min <= value)
         .reduce((prev, current) => prev.min > current.min ? prev : current, { min: 0, bonus: 0 });
      return bestRow?.bonus ?? 0;
   }

   #loadTables() {
      this.userTables = game.settings.get(game.system.id, 'userTables') ?? {};
   }
}
/*
game.fade.registry.getSystem("userTables").addTable('DwarfResiliance', "bonus", [
    {min:0, bonus:0},
    {min:7, bonus:2},
    {min:11, bonus:3},
    {min:15, bonus:4},
    {min:18, bonus:5},
]);
game.fade.registry.getSystem("userTables").getBonus("DwarfResiliance", 7);
eval('game.fade.registry.getSystem("userTables").getBonus("DwarfResiliance", 7)');
*/