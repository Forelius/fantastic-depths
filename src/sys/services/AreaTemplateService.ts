import { hasAreaTemplate } from "../../item/fields/TemplateField.js";
import { ClassSystemBase } from "../registry/ClassSystem.js";

/**
 * Places Foundry V14 Scene Regions (template-style) from item area-template data.
 */
export class AreaTemplateService {
   static readonly #OUT_OF_RANGE_COLOR = "#ff0000";
   static readonly #MESSAGE_FLAG = "messageId";

   /**
    * Chat-card click handler for .place-template buttons.
    */
   static async clickPlaceTemplate(event: Event): Promise<void> {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      const itemuuid = target.dataset.itemuuid;
      if (!itemuuid) return;

      const item = await fromUuid(itemuuid);
      if (!item || !hasAreaTemplate(item)) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.invalid"));
         return;
      }

      const owner = target.dataset.owneruuid ? await fromUuid(target.dataset.owneruuid) : null;
      const actor = item.actor ?? owner?.actor ?? owner ?? null;
      const messageId = (target.closest("[data-message-id]") as HTMLElement | null)?.dataset.messageId ?? null;
      await AreaTemplateService.placeFromItem(item, {
         actor,
         castAs: target.dataset.castas || null,
         messageId,
      });
   }

   /**
    * Chat-card click handler for .clear-template buttons.
    * Deletes regions spawned from this chat message.
    */
   static async clickClearTemplate(event: Event): Promise<void> {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLButtonElement;
      const messageId = (target.closest("[data-message-id]") as HTMLElement | null)?.dataset.messageId;
      if (!messageId || !canvas?.scene) return;

      const regionIds = AreaTemplateService.#regionsForMessage(messageId)
         .filter((r) => r.isOwner)
         .map((r) => r.id);
      if (!regionIds.length) return;

      target.disabled = true;
      try {
         await canvas.scene.deleteEmbeddedDocuments("Region", regionIds);
      } finally {
         target.disabled = false;
      }
   }

   /**
    * Show or hide the clear-template button on a chat message based on placed regions.
    */
   static toggleClearTemplateButton(messageId: string | null | undefined): void {
      if (!messageId || !canvas?.ready) return;

      const hasPlaced = AreaTemplateService.hasPlacedTemplate(messageId);
      document
         .querySelectorAll(`li[data-message-id="${messageId}"] .clear-template`)
         .forEach((button) => button.classList.toggle("hidden", !hasPlaced));
   }

   /**
    * Whether this chat message currently has an owned placed area region on the active scene.
    */
   static hasPlacedTemplate(messageId: string | null | undefined): boolean {
      if (!messageId || !canvas?.ready || !canvas.scene) return false;
      return AreaTemplateService.#regionsForMessage(messageId).some((r) => r.isOwner);
   }

   /**
    * Start placeRegion for an item's area template.
    */
   static async placeFromItem(item, options: { actor?: Actor; castAs?: string; messageId?: string | null } = {}): Promise<void> {
      if (!canvas?.scene || !canvas.ready) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.noScene"));
         return;
      }
      if (typeof canvas.regions?.placeRegion !== "function") {
         ui.notifications.error(game.i18n.localize("FADE.Chat.placeTemplate.noScene"));
         return;
      }

      const actor = options.actor ?? item.actor ?? null;
      const evalOptions = {
         actor,
         castAs: options.castAs || null,
      };
      const tpl = item.system.template;
      const length = await AreaTemplateService.#evaluateTemplateNumber(item, tpl.distance, evalOptions);
      if (!(length > 0)) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.invalidDistance"));
         return;
      }
      const directionRaw = await AreaTemplateService.#evaluateTemplateNumber(item, tpl.direction, evalOptions);
      const direction = Number.isFinite(directionRaw) ? ((directionRaw % 360) + 360) % 360 : 0;

      const maxRangeRaw = String(tpl.maxRange ?? "").trim();
      const maxRange = maxRangeRaw
         ? await AreaTemplateService.#evaluateTemplateNumber(item, maxRangeRaw, evalOptions)
         : null;

      const casterToken = AreaTemplateService.#resolveCasterToken(actor);
      const fillColor = game.user.color;

      const widthRaw = await AreaTemplateService.#evaluateTemplateNumber(item, tpl.width, evalOptions);
      const angleRaw = await AreaTemplateService.#evaluateTemplateNumber(item, tpl.angle, evalOptions);
      // Sheet distance/width are side lengths (feet). Do not hypot — Region rectangles use width×height.
      const shape = AreaTemplateService.#buildShape(tpl.type, {
         length,
         width: widthRaw,
         angle: angleRaw,
         direction,
      });
      if (!shape) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.invalid"));
         return;
      }

      const systemId = game.system.id;
      const levelId = canvas.level?.id;
      const regionData: Record<string, unknown> = {
         name: item.name ?? "Area Template",
         color: fillColor,
         shapes: [shape],
         restriction: { enabled: true },
         ...(levelId ? { levels: [levelId] } : {}),
         highlightMode: "coverage",
         displayMeasurements: true,
         visibility: CONST.REGION_VISIBILITY?.ALWAYS ?? 2,
         ownership: {
            [game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
         },
         flags: {
            core: { MeasuredTemplate: true },
            ...(options.messageId
               ? { [systemId]: { [AreaTemplateService.#MESSAGE_FLAG]: options.messageId } }
               : {}),
         },
      };

      const rangeLimited = maxRange !== null && !!casterToken;
      const outColor = AreaTemplateService.#OUT_OF_RANGE_COLOR;

      try {
         await canvas.regions.placeRegion(regionData, {
            allowRotation: true,
            create: true,
            onMove: rangeLimited
               ? ({ position, document, preview: prev }) => {
                    const out =
                       AreaTemplateService.#distanceToPoint(casterToken, position) > maxRange;
                    const color = out ? outColor : fillColor;
                    document.updateSource({ color });
                    prev?.document?.updateSource?.({ color });
                    prev?.renderFlags?.set?.({ refreshState: true });
                 }
               : undefined,
            preConfirm: ({ shape: placedShape }) => {
               if (!rangeLimited) return;
               const point = { x: Number(placedShape.x), y: Number(placedShape.y) };
               if (AreaTemplateService.#distanceToPoint(casterToken, point) > maxRange) {
                  ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.outOfRange"));
                  return false;
               }
            },
         });
      } catch (error) {
         console.error("Area template placement failed", error, { regionData });
         ui.notifications.error(game.i18n.localize("FADE.Chat.placeTemplate.invalid"));
      }
   }

   static #regionsForMessage(messageId: string) {
      const regions = canvas.scene?.regions;
      if (!regions) return [];
      return [...regions].filter(
         (r) => r.getFlag(game.system.id, AreaTemplateService.#MESSAGE_FLAG) === messageId
      );
   }

   /**
    * Scene feet → pixels.
    */
   static #toPixels(distance: number): number {
      const dims = canvas.dimensions;
      if (typeof dims?.distancePixels === "number" && dims.distancePixels > 0) {
         return Number(distance) * dims.distancePixels;
      }
      const grid = canvas.grid ?? canvas.scene?.grid;
      const unit = Number(grid?.distance) || Number(dims?.distance) || 5;
      const size = Number(grid?.size) || Number(dims?.size) || 100;
      return (Number(distance) / unit) * size;
   }

   /**
    * Map sheet template type + sizes to a Region shape (local origin at 0,0).
    * Shape field names match Foundry Region / dnd5e TemplatePlacement.
    */
   static #buildShape(
      type: string,
      sizes: { length: number; width: number; angle: number; direction: number }
   ): Record<string, unknown> | null {
      const { length, width, angle, direction } = sizes;
      const px = AreaTemplateService.#toPixels;
      // Cursor at shape origin (x,y). Circles/rects: center. Cones/rays: starting point.
      const center = { x: 0, y: 0, rotation: direction, anchorX: 0.5, anchorY: 0.5 };
      const origin = { x: 0, y: 0, rotation: direction, anchorX: 0, anchorY: 0 };

      switch (type) {
         case "circle":
            return { ...center, type: "circle", radius: px(length), rotation: 0 };
         case "cone":
            return {
               ...origin,
               type: "cone",
               radius: px(length),
               angle: angle > 0 ? angle : 53.13,
            };
         case "ray":
            return {
               ...origin,
               type: "line",
               length: px(length),
               width: px(width > 0 ? width : Math.max(length * 0.05, 5)),
            };
         case "rect": {
            const sideA = length;
            const sideB = width > 0 ? width : length;
            return {
               ...center,
               type: "rectangle",
               width: px(sideB),
               height: px(sideA),
            };
         }
         default:
            return null;
      }
   }

   static #resolveCasterToken(actor: Actor | null | undefined) {
      if (!canvas?.tokens) return null;
      const controlled = canvas.tokens.controlled?.[0] ?? null;
      if (controlled && (!actor || controlled.actor?.id === actor.id || controlled.document?.actorId === actor.id)) {
         return controlled;
      }
      if (!actor) return controlled;
      return canvas.tokens.placeables.find((t) => t.actor?.id === actor.id || t.document?.actorId === actor.id) ?? null;
   }

   static #distanceToPoint(casterToken, point: { x: number; y: number }): number {
      if (!casterToken?.center || !canvas?.grid) return 0;
      const distance = canvas.grid.measurePath([casterToken.center, point])?.distance;
      return Math.floor(Number(distance) || 0);
   }

   static async #evaluateTemplateNumber(item, formula, options: { actor?: Actor; castAs?: string } = {}): Promise<number> {
      const raw = String(formula ?? "").trim();
      if (!raw) return 0;
      if (/^[+-]?\d+(\.\d+)?$/.test(raw)) {
         return Number(raw);
      }

      const rollData = typeof item.getRollData === "function" ? item.getRollData() : { ...item.system };
      if (!rollData.actor && options.actor) {
         rollData.actor = options.actor.getRollData();
         rollData.classes = rollData.actor?.classes;
      }
      if (options.castAs) {
         const classSystem: ClassSystemBase = game.fade.registry.getSystem("classSystem");
         const parsed = classSystem.parseClassAs(options.castAs);
         if (parsed?.classId) {
            rollData.classes = rollData.classes || {};
            rollData.classes[parsed.classId] = { castLevel: parsed.classLevel };
         }
      }

      try {
         const rollEval = await new Roll(raw, rollData).evaluate();
         return Number(rollEval.total) || 0;
      } catch (error) {
         if (game.user.isGM) {
            console.error(`Invalid area template formula "${raw}" on ${item.name}.`, error);
         }
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.invalidDistance"));
         return 0;
      }
   }
}

/** @deprecated Use {@link AreaTemplateService}. */
export const MeasuredTemplateService = AreaTemplateService;
