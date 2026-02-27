export class SheetTab {
   id: string;
   group: string;
   label: string;
   active: boolean;
   cssClass: string;
   constructor(id, group, label, cssClass = null) {
      this.id = id;
      this.group = group;
      this.label = label;
      this.cssClass = cssClass;
   }
}