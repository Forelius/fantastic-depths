export class UserTables {
   constructor() {
      this.tableTypes = ["bonus"];
      this.userTables = {};
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
   }

   getTable(tableName) {
      return this.userTables[tableName];
   }

   getBonus(tableName, value) {
      const table = this.getTable(tableName).table;
      const bestRow = table.filter(row => row.min <= value)
         .reduce((prev, current) => prev.min > current.min ? prev : current, { min: 0, bonus: 0 });
      return bestRow.bonus;
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