export class fadeRegistry {
   constructor() {
      this.systemDictionary = {};
      this.eventDictionary = {};
      this.settingOptionDictionary = {};
   }

   registerSettingOption(key, options) {
      if (this.settingOptionDictionary[key] === undefined) {
         this.settingOptionDictionary[key] = [...options];
      } else {
         this.settingOptionDictionary[key] = [...this.settingOptionDictionary[key], ...options];
      }
   }

   getSettingOptions(key) {
      return this.settingOptionDictionary[key];
   }

   registerSystem(key, callback) {
      this.systemDictionary[key] = callback;
   }

   getSystem(key) {
      return this.systemDictionary[key];
   }
}