export class Collapser {
   /**
* Handles the click event for toggling collapsible sections.
* @param {Event} event - The click event on the collapsible header
*/
   static async toggleCollapsibleContent(event) {
      const $parent = $(event.target.closest('.collapser').parentNode); // Get the parent container
      await Collapser.toggleContent($parent);
   }

   /**
  * Toggles the collapsible content based on the isCollapsed state
  * @param {jQuery} $content - The collapsible content to toggle
  * @param {Boolean} isCollapsed - If true, collapse the content; if false, expand the content
  */
   static async toggleContent($parent, skipAnim = false) {
      const children = $parent.find('.collapsible-content');
      const isCollapsed = $(children[0]).hasClass('collapsed');

      if (isCollapsed === true) {
         // Expand the content
         children.each(async function (index, content) {
            let $content = $(content);
            $content.removeClass('collapsed');
            $content.css('height', $content.prop('scrollHeight') + 'px');
            setTimeout(() => { $content.css('height', ''); }, 100); // Adjust to match CSS transition duration
         });
      } else {
         // Collapse the content
         children.each(async function (index, content) {
            let $content = $(content);
            $content.css('height', $content.height() + 'px');
            $content.addClass('collapsed');
            setTimeout(() => { $content.css('height', '0'); }, 0);
         });
      }
   }
}
