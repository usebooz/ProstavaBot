import Queue from "bull";
import { ProstavaUtils, TelegramUtils } from "../utils";
import { PROSTAVA } from "../constants";
import { bot } from "../commons/bot";
import { User } from "../types";

export class ProstavaProcess {
    static async publishOrWithdrawCompletedProstavas(job: Queue.Job) {
        const completedProstavas = await ProstavaUtils.getPendingCompletedProstavasFromDB();
        for (const prostava of completedProstavas) {
            const command = prostava.is_request
                ? PROSTAVA.COMMAND.REQUEST_SAVE
                : prostava.is_preview
                ? PROSTAVA.COMMAND.PROSTAVA_UNDO
                : PROSTAVA.COMMAND.PROSTAVA_SAVE;
            const user = (prostava.is_request ? prostava.creator : prostava.author) as User;
            bot.handleUpdate(TelegramUtils.fillCommandFakeUpdate(prostava.group_id, user.user_id, command));
        }
    }

    static async remindUsersRateProstavas(job: Queue.Job) {
        const pendingProstavas = await ProstavaUtils.getPendingUncompletedProstavasFromDB();
        for (const prostava of pendingProstavas) {
            const command = prostava.is_request ? PROSTAVA.COMMAND.REQUEST_RATE : PROSTAVA.COMMAND.PROSTAVA_RATE;
            const user = (prostava.is_request ? prostava.creator : prostava.author) as User;
            bot.handleUpdate(TelegramUtils.fillCommandFakeUpdate(prostava.group_id, user.user_id, command));
        }
    }
}
