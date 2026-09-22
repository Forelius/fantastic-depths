const { NumberField, SchemaField, StringField } = foundry.data.fields;

/** Foundry MeasuredTemplate shape types supported by the system. */
export const AREA_TEMPLATE_TYPES = ["circle", "cone", "ray", "rect"] as const;

export type AreaTemplateType = typeof AREA_TEMPLATE_TYPES[number];

export type AreaTemplateData = {
   type: string;
   distance: number | null;
   angle: number | null;
   width: number | null;
};

/**
 * Nested schema for optional area-effect Measured Template geometry on items.
 */
export function defineAreaTemplateSchema() {
   return new SchemaField({
      type: new StringField({ required: false, initial: "" }),
      distance: new NumberField({ required: false, nullable: true, initial: null }),
      angle: new NumberField({ required: false, nullable: true, initial: null }),
      width: new NumberField({ required: false, nullable: true, initial: null }),
   });
}

/**
 * Whether an item has a placeable area template (known type + positive distance).
 */
export function hasAreaTemplate(item: { system?: { template?: AreaTemplateData } }): boolean {
   const template = item?.system?.template;
   if (!template) return false;
   return (AREA_TEMPLATE_TYPES as readonly string[]).includes(template.type)
      && Number(template.distance) > 0;
}
