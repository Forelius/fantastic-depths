import { fadeFinder } from '/systems/fantastic-depths/module/utils/finder.mjs';

/**
 * Utility class for treasure table rolls.
 */
export class fadeTreasure {
   constructor() {
      this.group = {
         coins: [],
         gems: [],
         jewelry: [],
         special: [],
         items: []
      }
   }

   async rollMultipleTables(inlines = [], tables = [], title = "") {
      const chatContentArray = [];
      if (title) {
         chatContentArray.push(`<div class="text-size18b">${title}</div>`);
      }
      await this.#doInlineRolls(inlines);
      await this.#doTableRolls(tables);

      if (this.group.coins.length > 0) {
         const total = this.group.coins.reduce((acc, item) => item.value + acc, 0);
         chatContentArray.push(`<div class="text-size16b">${game.i18n.format('FADE.treasure.coins', { total: total.toLocaleString() })}</div>`);
         chatContentArray.push(...this.group.coins.map(item => item.content));
      }
      if (this.group.gems.length > 0) {
         const total = this.group.gems.reduce((acc, item) => item.value + acc, 0);
         chatContentArray.push(`<div class="text-size16">${game.i18n.format('FADE.treasure.gems', { total: total.toLocaleString() })}</div>`);
         const normalized = this.group.gems.map(item => {
            return game.i18n.format('FADE.treasure.formatValue', { name: item.name, value: item.value.toLocaleString() });
         }).reduce((acc, item) => {
            const foundItem = acc.find(dupe => dupe.content === item);
            if (foundItem) foundItem.count++;
            else acc.push({ content: item, count: 1 });
            return acc;
         }, []).map(item => {
            return item.count > 1 ? `<div>${item.count}x ${item.content}</div>` : `<div>${item.content}</div>`;
         });
         chatContentArray.push(...normalized);
      }
      if (this.group.jewelry.length > 0) {
         const total = this.group.jewelry.reduce((acc, item) => item.value + acc, 0);
         chatContentArray.push(`<div class="text-size16b">${game.i18n.format('FADE.treasure.jewelry', { total: total.toLocaleString() })}</div>`);
         chatContentArray.push(...this.group.jewelry.map(item => item.content));
      }
      if (this.group.items.length > 0) {
         chatContentArray.push(`<div class="text-size16b">${game.i18n.localize('FADE.treasure.magic')}</div>`);
         chatContentArray.push(...this.group.items);
      }

      const chatMsgData = {
         content: chatContentArray.join('')
      };
      ChatMessage.applyRollMode(chatMsgData, "gmroll");
      ChatMessage.create(chatMsgData);
   }

   async #rollWorldTableMulti(tableName, rollFormula) {
      const table = await fadeFinder.getRollTable(tableName);
      if (!table) {
         console.error(`No RollTable named "${tableName}" found!`);
         return;
      }

      // Roll the formula to get how many times we'll draw
      const drawRoll = new Roll(rollFormula);
      await drawRoll.evaluate();
      const numberOfDraws = drawRoll.total;

      // Draw from the table multiple times
      const results = [];
      for (let i = 0; i < numberOfDraws; i++) {
         // Draw once. Set displayChat to false to avoid spammy chat messages for each draw
         const draw = await table.draw({ displayChat: false });
         // Usually draw.results is an array; we’ll grab the text from the first result
         const resultText = draw.results.map(r => r.getChatText());
         results.push(resultText.length > 0 ? resultText : resultText[0]);
      }

      return this.#formatOutput(results);
   }

   async #doTableRolls(tables) {
      for (const tableData of tables) {
         const { name, formula = '1', chance } = tableData;

         // Validate input
         if (!name) {
            console.error("Invalid table data. Each object must have 'name'.");
            continue;
         }

         // Roll a 1d100 to determine if the table will be rolled
         let isRolling = true;
         if (chance !== undefined) {
            const roll = new Roll("1d100");
            await roll.evaluate();
            isRolling = roll.total <= chance;
         }

         if (isRolling === true) {
            this.group.items.push(await this.#rollWorldTableMulti(name, formula));
         }
      }
   }

   async #doInlineRolls(items) {
      // Process coin rolls
      for (const item of items) {
         const { type, formula = "1", chance = 100 } = item;

         // Validate coin type
         if (!type) {
            console.error("Invalid data. Each object must have a 'type'.");
            continue;
         }

         // Roll for chance to generate coins
         let isRolling = true;
         if (chance !== undefined) {
            const roll = new Roll("1d100");
            await roll.evaluate();
            isRolling = roll.total <= chance;
         }

         if (isRolling) {
            // Roll the formula to determine the coin count
            const itemRoll = new Roll(formula);
            await itemRoll.evaluate();
            if (type === 'gems') {
               this.#processGemsRoll(itemRoll);
            } else if (type === 'jewelry') {
               await this.#processJewelryRoll(itemRoll);
            } else {
               this.#processCoinRoll(type, itemRoll);
            }
         }
      }
   }

   #processCoinRoll(type, itemRoll) {
      const localizedType = game.i18n.localize(`FADE.treasure.${type}.plural`) || type;
      this.group.coins.push({
         content: `<p>${itemRoll.total.toLocaleString()} ${localizedType}</p>`,
         value: CONFIG.FADE.TreasureTypes.coins[type] * itemRoll.total
      });
   }

   async #processJewelryRoll(itemRoll) {
      const jewelryValues = CONFIG.FADE.TreasureTypes.jewelry.values;
      for (let i = 0; i < itemRoll.total; i++) {
         const random = Math.floor(Math.random() * 100) + 1;
         const jewelryValue = jewelryValues.find(entry => { return random >= entry.min && random <= entry.max; });
         if (jewelryValue) {
            const rollTableConfig = CONFIG.FADE.TreasureTypes.jewelry.rollTables.find(item => jewelryValue.value >= item.min && jewelryValue.value <= item.max);
            // Find the roll table by name
            const table = await fadeFinder.getRollTable(rollTableConfig.table);
            if (table) {
               // Draw once. Set displayChat to false to avoid too numerous chat messages for each draw
               const draw = await table.draw({ displayChat: false });
               let resultText = draw.results.map(r => r.getChatText());
               resultText = resultText.length > 0 ? resultText : resultText[0];
               const content = game.i18n.format('FADE.treasure.formatValue', { name: resultText, value: jewelryValue.value.toLocaleString() });
               this.group.jewelry.push({ content: `<div>${content}</div>`, value: jewelryValue.value });
            } else {
               console.error(`RollTable named "${tableName}" not found.`);
            }
         } else {
            console.warn(`No jewelry value found for ${random}`);
         }
      }
   }

   #processGemsRoll(itemRoll) {
      const gemsArray = CONFIG.FADE.TreasureTypes.gems;
      for (let i = 0; i < itemRoll.total; i++) {
         const random = Math.floor(Math.random() * (gemsArray.length));
         const gem = gemsArray[random];
         const localizedType = game.i18n.localize(`FADE.treasure.${gem.type}`) || gem.type;
         this.group.gems.push({ name: localizedType, value: gem.value });
      }
   }

   #formatOutput(textResults) {
      let output = "<div>";
      for (const resultText of textResults) {
         if (Array.isArray(resultText)) {
            output += `<div><span>${resultText[0]}</span>`;
            if (resultText.length > 1 && resultText[1]) {
               output += ` - `;
               for (let i = 1; i < resultText.length; i++) {
                  output += `<span style='font-style:italic'>${resultText[i]}</span>`;
                  if (i !== resultText.length - 1) output += ', ';
               }
               output += `</div>`;
            }
         } else {
            output += `<div>${resultText}</div>`;
         }
      }
      output += "</div>";

      return output;
   }
}