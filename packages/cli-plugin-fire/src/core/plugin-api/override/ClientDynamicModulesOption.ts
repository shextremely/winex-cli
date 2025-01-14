/**
 * Module dependencies.
 */

import AsyncOption from '../abstract/AsyncOption';

/**
 * clientDynamicModules option.
 */

export default class ClientDynamicModulesOption extends AsyncOption {
  //@ts-ignore
  async apply(ctx) {
    await super.asyncApply();

    // eslint-disable-next-line no-restricted-syntax
    for (const { value, name: pluginName } of this.appliedItems) {
      const { name, content, dirname = 'dynamic' } = value;
      await ctx.writeTemp(
        `${dirname}/${name}`,
        `
/**
 * Generated by "${pluginName}"
 */
${content}\n\n
        `.trim()
      );
    }
  }
}
