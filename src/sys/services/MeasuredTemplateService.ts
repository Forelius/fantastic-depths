import { hasAreaTemplate } from "../../item/fields/TemplateField.js";
import { ClassSystemBase } from "../registry/ClassSystem.js";

/**
 * Places Foundry Measured Templates from item area-template data.
 */
export class MeasuredTemplateService {
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
      await MeasuredTemplateService.placeFromItem(item, {
         actor,
         castAs: target.dataset.castas || null,
         messageId,
      });
   }

   /**
    * Chat-card click handler for .clear-template buttons.
    * Deletes measured templates spawned from this chat message.
    */
   static async clickClearTemplate(event: Event): Promise<void> {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLButtonElement;
      const messageId = (target.closest("[data-message-id]") as HTMLElement | null)?.dataset.messageId;
      if (!messageId || !canvas?.scene) return;

      const templateIds = canvas.scene.templates
         .filter((t) => t.getFlag(game.system.id, "messageId") === messageId && t.isOwner)
         .map((t) => t.id);
      if (!templateIds.length) return;

      target.disabled = true;
      try {
         await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", templateIds);
      } finally {
         target.disabled = false;
      }
   }

   /**
    * Show or hide the clear-template button on a chat message based on placed templates.
    */
   static toggleClearTemplateButton(messageId: string | null | undefined): void {
      if (!messageId || !canvas?.ready) return;

      const hasMeasuredTemplates = !!canvas.scene?.templates.some(
         (t) => t.getFlag(game.system.id, "messageId") === messageId && t.isOwner
      );
      document
         .querySelectorAll(`li[data-message-id="${messageId}"] .clear-template`)
         .forEach((button) => button.classList.toggle("hidden", !hasMeasuredTemplates));
   }

   /**
    * Whether this chat message currently has an owned placed template on the active scene.
    */
   static hasPlacedTemplate(messageId: string | null | undefined): boolean {
      if (!messageId || !canvas?.ready || !canvas.scene) return false;
      return canvas.scene.templates.some(
         (t) => t.getFlag(game.system.id, "messageId") === messageId && t.isOwner
      );
   }

   /** Preview fill when the template origin is beyond maxRange. */
   static readonly #OUT_OF_RANGE_COLOR = "#ff0000";

   /**
    * Start a cursor-follow template preview and create it on the scene when confirmed.
    */
   static async placeFromItem(item, options: { actor?: Actor; castAs?: string; messageId?: string | null } = {}): Promise<void> {
      if (!canvas?.scene || !canvas.ready) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.noScene"));
         return;
      }

      const actor = options.actor ?? item.actor ?? null;
      const evalOptions = {
         actor,
         castAs: options.castAs || null,
      };
      const tpl = item.system.template;
      const length = await MeasuredTemplateService.#evaluateTemplateNumber(item, tpl.distance, evalOptions);
      if (!(length > 0)) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.invalidDistance"));
         return;
      }
      const directionRaw = await MeasuredTemplateService.#evaluateTemplateNumber(item, tpl.direction, evalOptions);
      const direction = Number.isFinite(directionRaw) ? ((directionRaw % 360) + 360) % 360 : 0;

      // Blank maxRange = no placement limit. Explicit "0" (or formula → 0) = origin on/near caster.
      const maxRangeRaw = String(tpl.maxRange ?? "").trim();
      const maxRange = maxRangeRaw
         ? await MeasuredTemplateService.#evaluateTemplateNumber(item, maxRangeRaw, evalOptions)
         : null;

      const casterToken = MeasuredTemplateService.#resolveCasterToken(actor);
      const fillColor = typeof game.user.color === "string"
         ? game.user.color
         : (game.user.color?.css ?? "#000000");

      const templateData: Record<string, unknown> = {
         t: tpl.type,
         user: game.user.id,
         distance: length,
         direction,
         x: casterToken?.center?.x ?? canvas.stage.pivot.x,
         y: casterToken?.center?.y ?? canvas.stage.pivot.y,
         fillColor,
         hidden: false,
      };

      if (options.messageId) {
         templateData.flags = {
            [game.system.id]: {
               messageId: options.messageId,
            },
         };
      }

      if (tpl.type === "cone") {
         const angle = await MeasuredTemplateService.#evaluateTemplateNumber(item, tpl.angle, evalOptions);
         templateData.angle = angle > 0 ? angle : 53.13;
      } else if (tpl.type === "ray") {
         const width = await MeasuredTemplateService.#evaluateTemplateNumber(item, tpl.width, evalOptions);
         if (width > 0) {
            templateData.width = width;
         }
      } else if (tpl.type === "rect") {
         // Sheet distance/width are side lengths. Foundry stores the diagonal and its
         // angle (e.g. a 10'×10' square → distance ≈ 14.142, direction 45).
         // If width is set, derive that angle from the sides. Otherwise keep the sheet
         // direction (blank → 0 would be a degenerate line; default to a square).
         const widthRaw = await MeasuredTemplateService.#evaluateTemplateNumber(item, tpl.width, evalOptions);
         if (widthRaw > 0) {
            templateData.distance = Math.hypot(length, widthRaw);
            templateData.direction = Math.atan2(widthRaw, length) * (180 / Math.PI);
         } else if (!String(tpl.direction ?? "").trim()) {
            templateData.distance = Math.hypot(length, length);
            templateData.direction = 45;
         }
         // else: distance stays as the Foundry diagonal; direction from the sheet.
      }

      const DocumentClass = CONFIG.MeasuredTemplate.documentClass;
      const ObjectClass = CONFIG.MeasuredTemplate.objectClass;
      const document = new DocumentClass(templateData, { parent: canvas.scene });
      const object = new ObjectClass(document);

      try {
         await MeasuredTemplateService.#drawPreview(object, { casterToken, maxRange, fillColor });
      } catch {
         // Placement cancelled (right-click / Escape).
      }
   }

   /**
    * Controlled token if it belongs to the placing actor; otherwise first owned token on the scene.
    */
   static #resolveCasterToken(actor: Actor | null | undefined) {
      if (!canvas?.tokens) return null;
      const controlled = canvas.tokens.controlled?.[0] ?? null;
      if (controlled && (!actor || controlled.actor?.id === actor.id || controlled.document?.actorId === actor.id)) {
         return controlled;
      }
      if (!actor) return controlled;
      return canvas.tokens.placeables.find((t) => t.actor?.id === actor.id || t.document?.actorId === actor.id) ?? null;
   }

   /**
    * Grid distance from caster token center to template origin (scene distance units).
    */
   static #distanceToOrigin(casterToken, origin: { x: number; y: number }): number {
      if (!casterToken?.center || !canvas?.grid) return 0;
      const waypoints = [casterToken.center, origin];
      const distance = canvas.grid.measurePath(waypoints)?.distance;
      return Math.floor(Number(distance) || 0);
   }

   /**
    * Same pattern as spell duration: getRollData, optional castAs patch, Roll.evaluate.
    */
   static async #evaluateTemplateNumber(item, formula, options: { actor?: Actor; castAs?: string } = {}): Promise<number> {
      const raw = String(formula ?? "").trim();
      if (!raw) return 0;
      if (/^[+-]?\d+(\.\d+)?$/.test(raw)) {
         return Number(raw);
      }

      const rollData = typeof item.getRollData === "function" ? item.getRollData() : { ...item.system };
      // Contained spells may have no parent actor; use the chat card owner when provided.
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

   /**
    * Preview the template until left-click places it or the user cancels.
    * When maxRange is set, tints red and blocks confirm if the origin is too far from the caster.
    */
   static async #drawPreview(
      object,
      options: { casterToken?; maxRange: number | null; fillColor: string } = { maxRange: null, fillColor: "#000000" }
   ): Promise<void> {
      const initialLayer = canvas.activeLayer;
      const { casterToken, maxRange, fillColor } = options;
      const rangeLimited = maxRange !== null && casterToken;

      await object.draw();
      object.layer.activate();
      object.layer.preview.addChild(object);

      return new Promise((resolve, reject) => {
         let outOfRange = false;

         const snapPosition = (pos: { x: number; y: number }) => {
            if (typeof canvas.grid.getSnappedPoint === "function") {
               const mode = CONST.GRID_SNAPPING_MODES?.CENTER;
               return mode !== undefined
                  ? canvas.grid.getSnappedPoint(pos, { mode })
                  : canvas.grid.getSnappedPoint(pos, { mode: 1 });
            }
            if (typeof canvas.grid.getSnappedPosition === "function") {
               const snapped = canvas.grid.getSnappedPosition(pos.x, pos.y, 2);
               return { x: snapped.x, y: snapped.y };
            }
            return pos;
         };

         const applyRangeVisual = (origin: { x: number; y: number }) => {
            if (!rangeLimited) {
               outOfRange = false;
               return;
            }
            const distance = MeasuredTemplateService.#distanceToOrigin(casterToken, origin);
            outOfRange = distance > maxRange;
            object.document.updateSource({
               fillColor: outOfRange ? MeasuredTemplateService.#OUT_OF_RANGE_COLOR : fillColor,
            });
         };

         const move = (event) => {
            event.stopPropagation();
            const pos = event.getLocalPosition(object.layer);
            const snapped = snapPosition(pos);
            object.document.updateSource({ x: snapped.x, y: snapped.y });
            applyRangeVisual(snapped);
            object.refresh();
         };

         const rotate = (event: WheelEvent) => {
            if (event.ctrlKey) event.preventDefault();
            event.stopPropagation();
            const step = event.shiftKey ? 15 : 5;
            const delta = Math.sign(event.deltaY) * -step;
            const direction = (Number(object.document.direction) + delta + 360) % 360;
            object.document.updateSource({ direction });
            object.refresh();
         };

         const cleanup = () => {
            canvas.stage.off("mousemove", move);
            canvas.stage.off("mousedown", confirm);
            window.removeEventListener("keydown", onKeyDown);
            if (canvas.app?.view) {
               canvas.app.view.oncontextmenu = null;
               canvas.app.view.onwheel = null;
            }
            if (typeof object.layer.clearPreviewContainer === "function") {
               object.layer.clearPreviewContainer();
            } else if (object.layer.preview) {
               object.layer.preview.removeChildren().forEach((c) => c.destroy({ children: true }));
            }
            initialLayer?.activate();
         };

         const confirm = async (event) => {
            event.stopPropagation();
            if (event.button !== 0) return;
            if (outOfRange) {
               ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.outOfRange"));
               return;
            }
            cleanup();
            const data = object.document.toObject();
            delete data._id;
            await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [data]);
            resolve();
         };

         const cancel = (event?) => {
            event?.preventDefault?.();
            cleanup();
            reject(new Error("Template placement cancelled"));
         };

         const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
               cancel(event);
            }
         };

         canvas.stage.on("mousemove", move);
         canvas.stage.on("mousedown", confirm);
         if (canvas.app?.view) {
            canvas.app.view.oncontextmenu = cancel;
            canvas.app.view.onwheel = rotate;
         }
         window.addEventListener("keydown", onKeyDown);

         const cursor = canvas.mousePosition;
         const origin = cursor
            ? snapPosition(cursor)
            : { x: Number(object.document.x), y: Number(object.document.y) };
         object.document.updateSource({ x: origin.x, y: origin.y });
         applyRangeVisual(origin);
         object.refresh();
      });
   }
}
