import { UpdateContext } from "../types";
import { HelpView } from "../views";

export class HelpController {
    static async showHelp(ctx: UpdateContext) {
        await ctx.replyWithHTML(await HelpView.getHelpHtml(ctx.i18n));
    }
}
