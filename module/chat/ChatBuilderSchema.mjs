export class ChatBuilderSchema extends foundry.abstract.DataModel {
   static defineSchema() {
      const { fields } = foundry.data;
      const datasetOpts = {
         required: false,
         initial: undefined,
         readonly: false,
      };

      /**
       * @param {fadeActor} caller - The item or actor the chat pertains to.
       * @param {fadeItem} context - The actor the chat pertains to.
       * @param {Roll} roll - A dice roll the chat pertains to.
       * @param {Object} resp - Data polled from the user from an Application.
       * @param {Object} mdata - Details for chat card enrichment.
       * @param {Object[]} batch - Bulk object data for batch processing.
       * @param {Object} options - Options passed directly to ChatMessage.create().
       */
      return {
         caller: new fields.ObjectField(datasetOpts),
         context: new fields.ObjectField(datasetOpts),
         roll: new fields.ObjectField(datasetOpts),
         resp: new fields.ObjectField(datasetOpts),
         mdata: new fields.ObjectField(datasetOpts),
         batch: new fields.ArrayField(new fields.ObjectField(), datasetOpts),
         options: new fields.ObjectField(),
      };
   }
}