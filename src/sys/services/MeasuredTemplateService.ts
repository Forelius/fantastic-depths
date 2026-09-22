import { hasAreaTemplate } from "../../item/fields/TemplateField.js";

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

      await MeasuredTemplateService.placeFromItem(item);
   }

   /**
    * Start a cursor-follow template preview and create it on the scene when confirmed.
    */
   static async placeFromItem(item): Promise<void> {
      if (!canvas?.scene || !canvas.ready) {
         ui.notifications.warn(game.i18n.localize("FADE.Chat.placeTemplate.noScene"));
         return;
      }

      const tpl = item.system.template;
      const token = canvas.tokens.controlled?.[0];
      const fillColor = typeof game.user.color === "string"
         ? game.user.color
         : (game.user.color?.css ?? "#000000");

      const templateData: Record<string, unknown> = {
         t: tpl.type,
         user: game.user.id,
         distance: Number(tpl.distance),
         direction: 0,
         x: token?.center?.x ?? canvas.stage.pivot.x,
         y: token?.center?.y ?? canvas.stage.pivot.y,
         fillColor,
         hidden: false,
      };

      if (tpl.type === "cone") {
         templateData.angle = Number(tpl.angle) > 0 ? Number(tpl.angle) : 53.13;
      } else if (tpl.type === "ray") {
         if (Number(tpl.width) > 0) {
            templateData.width = Number(tpl.width);
         }
      } else if (tpl.type === "rect") {
         // Sheet distance/width are side lengths. Foundry stores the diagonal and its
         // angle (e.g. a 10'×10' square → distance ≈ 14.142, direction 45).
         const length = Number(tpl.distance);
         const width = Number(tpl.width) > 0 ? Number(tpl.width) : length;
         templateData.distance = Math.hypot(length, width);
         templateData.direction = Math.atan2(width, length) * (180 / Math.PI);
      }

      const DocumentClass = CONFIG.MeasuredTemplate.documentClass;
      const ObjectClass = CONFIG.MeasuredTemplate.objectClass;
      const document = new DocumentClass(templateData, { parent: canvas.scene });
      const object = new ObjectClass(document);

      try {
         await MeasuredTemplateService.#drawPreview(object);
      } catch {
         // Placement cancelled (right-click / Escape).
      }
   }

   /**
    * Preview the template until left-click places it or the user cancels.
    */
   static async #drawPreview(object): Promise<void> {
      const initialLayer = canvas.activeLayer;
      await object.draw();
      object.layer.activate();
      object.layer.preview.addChild(object);

      return new Promise((resolve, reject) => {
         const snapPosition = (pos: { x: number; y: number }) => {
            if (typeof canvas.grid.getSnappedPoint === "function") {
               const mode = CONST.GRID_SNAPPING_MODES?.CENTER;
               return mode !== undefined
                  ? canvas.grid.getSnappedPoint(pos, { mode })
                  : canvas.grid.getSnappedPoint(pos, { mode: 1 });
            }
            // Fallback for older grid APIs
            if (typeof canvas.grid.getSnappedPosition === "function") {
               const snapped = canvas.grid.getSnappedPosition(pos.x, pos.y, 2);
               return { x: snapped.x, y: snapped.y };
            }
            return pos;
         };

         const move = (event) => {
            event.stopPropagation();
            const pos = event.getLocalPosition(object.layer);
            const snapped = snapPosition(pos);
            object.document.updateSource({ x: snapped.x, y: snapped.y });
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
         if (cursor) {
            const snapped = snapPosition(cursor);
            object.document.updateSource({ x: snapped.x, y: snapped.y });
            object.refresh();
         }
      });
   }
}
