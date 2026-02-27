/* eslint-disable @typescript-eslint/no-explicit-any */
// globals.d.ts
export { };

declare global {
   // Base case – a leaf value can be any *known* type.
   // We use `unknown` instead of `any` so the compiler forces you to
   // narrow the value before you can use it.
   type Leaf = unknown;
   // Recursive definition – each key maps to either a leaf value
   // or another PropertyBag, allowing unlimited nesting.
   type PropertyBag = {
      [K: string]: Leaf | PropertyBag;
   };

   const game: any;
   const CONFIG: any;
   type Token = any;
   type ActiveEffect = any;

   class DataModel {
      static defineSchema();
   }

   class FDocument extends DataModel {
      id: string;
      uuid: string;
      name: string;
      type: string;
      sheet: any;
      system: any;
      isOwner: boolean;
      pack: any;
      _id: string;
            
      static create(data: any, operation?: any): Promise<FDocument>;
      _preCreate(data: any, options: any, user: any): Promise<boolean | void>;
      prepareBaseData();
      prepareDerivedData();
      delete(operation?: any): Promise<FDocument>;
      update(data: any, operation?: any): Promise<FDocument>;
      updateSource(changes: any, options?: any): object;
      testUserPermission(user: any, permission: string, rest?: any);
      createEmbeddedDocuments(embeddedName: string, data: object[], operation?: any): Promise<FDocument[]>;
      toObject(source?: boolean);
   }

   class FCollection<T> extends Array {
      size: number;
      get(id: string): T;
   }

   class Item extends FDocument {
      actor: Actor;
      parent: Actor;
      effects: FCollection<FDocument>;
      img: string;
      static DEFAULT_ICON: string;
      static implementation: typeof Item;

      static fromDropData(data: any, options?: any): Promise<Item>;

      constructor(data, context);
      _onUpdate(changed: object, options: object, userId: string): void;
   }

   class Actor extends FDocument {
      items: FCollection<Item>;
      parent: any;
      token: Token;

      get currentActiveToken(): Token;

      constructor(data, context);
      getRollData();
      toggleStatusEffect(statusId: string, any): Promise<void>;
      getActiveTokens(): any[];
      allApplicableEffects();
      modifyTokenAttribute(attribute: string, value: number, isDelta?: boolean, isBar?: boolean): Promise<Actor>;
   }   
}