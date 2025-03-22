export class fadeRegistry {
   constructor() {
      this.systemDictionary = {};
      this.eventDictionary = {};
   }

   registerSystem(key, callback) {
      this.systemDictionary[key] = callback;
   }

   getSystem(key) {
      return this.systemDictionary[key];
   }
}