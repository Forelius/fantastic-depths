export class AddonIntegration {
   static setupItemPiles() {
      // see docs for more info https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/master/docs/api.md
      Hooks.once("item-piles-ready", async () => {
         game.itempiles.API.addSystemIntegration({
            "VERSION": "1.0.0",
            // Currencies in item piles is a versatile system that can accept actor attributes (a number field on the actor's sheet) or items (actual items in their inventory)
            "CURRENCIES": [
               {
                  "type": "item",
                  "name": "Platinum Piece",
                  "img": "icons/commodities/currency/coin-inset-compass-silver.webp",
                  "abbreviation": "{#} pp",
                  "data": {
                     "item": {
                        "name": "Platinum Piece",
                        "type": "treasure",
                        "img": "icons/commodities/currency/coin-inset-compass-silver.webp",
                        "system": {
                           "quantity": 0,
                           "quantityMax": 0,
                           "weight": 1,
                           "cost": 5,
                        },
                     }
                  },
                  "primary": false,
                  "exchangeRate": 5,
                  "secondary": false,
                  "index": 0
               },
               {
                  "type": "item",
                  "name": "Gold Piece",
                  "img": "icons/commodities/currency/coin-embossed-crown-gold.webp",
                  "abbreviation": "{#} gp",
                  "data": {
                     "item": {
                        "name": "Gold Piece",
                        "type": "treasure",
                        "img": "icons/commodities/currency/coin-embossed-crown-gold.webp",
                        "system": {
                           "quantity": 0,
                           "quantityMax": 0,
                           "weight": 1,
                           "cost": 1,
                        },
                     }
                  },
                  "primary": true,
                  "exchangeRate": 1,
                  "secondary": false,
                  "index": 1
               },
               {
                  "type": "item",
                  "name": "Electrum Piece",
                  "img": "icons/commodities/currency/coin-engraved-waves-copper.webp",
                  "abbreviation": "{#} ep",
                  "data": {
                     "item": {
                        "name": "Electrum Piece",
                        "type": "treasure",
                        "img": "icons/commodities/currency/coin-engraved-waves-copper.webp",
                        "system": {
                           "quantity": 0,
                           "quantityMax": 0,
                           "weight": 1,
                           "cost": 0.5,
                        },
                     }
                  },
                  "primary": false,
                  "exchangeRate": 0.5,
                  "secondary": false,
                  "index": 2
               },
               {
                  "type": "item",
                  "name": "Silver Piece",
                  "img": "icons/commodities/currency/coin-embossed-unicorn-silver.webp",
                  "abbreviation": "{#} sp",
                  "data": {
                     "item": {
                        "name": "Silver Piece",
                        "type": "treasure",
                        "img": "icons/commodities/currency/coin-embossed-unicorn-silver.webp",
                        "system": {
                           "quantity": 0,
                           "quantityMax": 0,
                           "weight": 1,
                           "cost": 0.1,
                        },
                     }
                  },
                  "primary": false,
                  "exchangeRate": 0.1,
                  "secondary": false,
                  "index": 3
               },
               {
                  "type": "item",
                  "name": "Copper Piece",
                  "img": "icons/commodities/currency/coin-oval-rune-copper.webp",
                  "abbreviation": "{#} cp",
                  "data": {
                     "item": {
                        "name": "Copper Piece",
                        "type": "treasure",
                        "img": "icons/commodities/currency/coin-oval-rune-copper.webp",
                        "system": {
                           "quantity": 0,
                           "quantityMax": 0,
                           "weight": 1,
                           "cost": 0.01,
                        },
                     }
                  },
                  "primary": false,
                  "exchangeRate": 0.01,
                  "secondary": false,
                  "index": 4
               }
            ],
            "SECONDARY_CURRENCIES": [],
            "CURRENCY_DECIMAL_DIGITS": 0.00001,
            // Item types and the filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, feats, and classes
            "ITEM_FILTERS": [
               {
                  "path": "type",
                  "filters": "class, spell, skill, weaponMastery, mastery, condition, specialAbility, species"
               }
            ],
            "ITEM_SIMILARITIES": [
               "name",
               "type"
            ],
            "UNSTACKABLE_ITEM_TYPES": [
               "weapon",
               "armor"
            ],
            "ACTOR_CLASS_TYPE": "character",
            "ITEM_CLASS_LOOT_TYPE": "item",
            "ITEM_CLASS_WEAPON_TYPE": "weapon",
            "ITEM_CLASS_EQUIPMENT_TYPE": "item",
            "ITEM_QUANTITY_ATTRIBUTE": "system.quantity",
            "ITEM_PRICE_ATTRIBUTE": "system.cost",
            "QUANTITY_FOR_PRICE_ATTRIBUTE": "flags.item-piles.system.quantityForPrice"
         });
      });
   }
}