const { SchemaField, StringField } = foundry.data.fields;

/** Foundry MeasuredTemplate shape types supported by the system. */
export const AREA_TEMPLATE_TYPES = ["circle", "cone", "ray", "rect"] as const;

export type AreaTemplateType = typeof AREA_TEMPLATE_TYPES[number];

export type AreaTemplateData = {
   type: string;
   /** Plain number or Foundry roll formula (e.g. "40" or "10+(@actor.details.level*2)"). */
   distance: string;
   angle: string;
   width: string;
};

/**
 * Nested schema for optional area-effect Measured Template geometry on items.
 * Distance/angle/width are strings so they can hold roll formulas.
 */
export function defineAreaTemplateSchema() {
   return new SchemaField({
      type: new StringField({ required: false, initial: "" }),
      distance: new StringField({ required: false, initial: "" }),
      angle: new StringField({ required: false, initial: "" }),
      width: new StringField({ required: false, initial: "" }),
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
