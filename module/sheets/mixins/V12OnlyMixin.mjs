const V12OnlyMixin = (mixin, superclass) => {
   return Number(game.version) < 13 ? mixin(superclass) : superclass;
};
export { V12OnlyMixin }