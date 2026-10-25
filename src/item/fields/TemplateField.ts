const { SchemaField, StringField } = foundry.data.fields;

/** Area template shape types (mapped to Scene Region shapes at place time). */
export const AREA_TEMPLATE_TYPES = ["circle", "cone", "ray", "rect"] as const;

export type AreaTemplateType = typeof AREA_TEMPLATE_TYPES[number];

export type AreaTemplateData = {
   type: string;
   /** Plain number or Foundry roll formula (e.g. "40" or "10+(@actor.details.level*2)"). */
   distance: string;
   direction: string;
   angle: string;
   width: string;
   /** Max distance from caster to template origin (feet/scene units). Blank = no limit. */
   maxRange: string;
};

/**
 * Nested schema for optional area-effect geometry on items (placed as Scene Regions).
 * Distance/direction/angle/width/maxRange are strings so they can hold roll formulas.
 */
export function defineAreaTemplateSchema() {
   return new SchemaField({
      type: new StringField({ required: false, initial: "" }),
      distance: new StringField({ required: false, initial: "" }),
      direction: new StringField({ required: false, initial: "" }),
      angle: new StringField({ required: false, initial: "" }),
      width: new StringField({ required: false, initial: "" }),
      maxRange: new StringField({ required: false, initial: "" }),
   });
}

/**
 * Whether an item has a configured area template (known type + non-empty distance formula).
 * Does not evaluate the formula; placement does that.
 */
export function hasAreaTemplate(item: { system?: { template?: AreaTemplateData } }): boolean {
   const template = item?.system?.template;
   if (!template) return false;
   const distance = String(template.distance ?? "").trim();
   return (AREA_TEMPLATE_TYPES as readonly string[]).includes(template.type)
      && distance.length > 0;
}
