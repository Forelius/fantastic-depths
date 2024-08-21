export class ActorFactory {
   static createActor(data, context) {
      // Determine the appropriate actor class based on the actor type
      const ActorClass = CONFIG.Actor.documentClasses[data.type] || Actor;
      // Return a new instance of the appropriate actor class
      return new ActorClass(data, context);
   }
}
