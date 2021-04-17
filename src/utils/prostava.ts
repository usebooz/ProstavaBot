import { Types } from "mongoose";
import { Venue } from "telegraf/typings/core/types/typegram";
import { CODE } from "../constants";
import { Group, Prostava, ProstavaStatus, UpdateContext, User } from "../types";
import { StringUtils } from "./string";
import { TelegramUtils } from "./telegram";

export class ProstavaUtils {
    static getProstavaFromContext(ctx: UpdateContext) {
        return ctx.prostava || ctx.session?.prostava;
    }

    static fillProstavaFromText(ctx: UpdateContext) {
        const chat = TelegramUtils.getChatFromContext(ctx);
        const commandText = TelegramUtils.getCommandText(ctx);
        const prostavaData = commandText?.split("|") || [];
        return {
            //TODO Why
            _id: Types.ObjectId(),
            group_id: chat.id,
            author: ctx.user,
            prostava_data: {
                title: prostavaData[0],
                date: new Date(prostavaData[1] || Date.now()),
                venue: {
                    title: prostavaData[2]
                },
                cost: this.fillProstavaCostFromText(prostavaData[3], ctx.group.settings.currency)
            }
        };
    }
    static fillProstavaCostFromText(costText: string, currency?: string) {
        const cost = costText?.split(/(?=\p{Sc})/u) || [];
        return {
            amount: Number(cost[0]),
            currency: cost[1] || currency
        };
    }
    static fillProstavaFromDeleted(prostava: Prostava) {
        return {
            group_id: prostava.group_id,
            author: prostava.author,
            prostava_data: prostava.prostava_data
        };
    }

    static updateTotalRating(participants: Prostava["participants"]) {
        return (
            this.filterParticipantsWere(participants).reduce(
                (ratingSum, participant) => ratingSum + participant.rating,
                0
            ) / participants.length
        );
    }

    static populateGroupProstavas(group: Group) {
        //TODO Autopopulate via mongo mb???
        (group.prostavas as [Prostava]).forEach(async (prostava) => {
            prostava.author = ProstavaUtils.findUserById(group.users, prostava.author) || prostava.author;
            prostava.participants?.forEach((participant) => {
                participant.user = ProstavaUtils.findUserById(group.users, participant.user) || participant.user;
            });
        });
    }
    static findUserById(users: Group["users"], userId: Prostava["author"]) {
        return (users as [User]).find((user) => user._id.equals(userId as Types.ObjectId));
    }
    static findUserByUserId(users: Group["users"], userId: number) {
        return (users as [User]).find((user) => user.user_id === userId);
    }
    static findParticipantByUserId(participants: Prostava["participants"], userId: number) {
        return participants.find((participant) => (participant.user as User).user_id === userId);
    }
    static deleteProstavaById(prostavas: Group["prostavas"], deletedProstava: Prostava | Types.ObjectId) {
        return prostavas.filter(
            (prostava) => !(prostava as Prostava)._id.equals((deletedProstava as Prostava)._id)
        ) as [Prostava | Types.ObjectId];
    }

    static getRatingString(rating: Prostava["rating"], ratingString: Prostava["rating_string"]) {
        const missCode = Object.values(CODE.RATING)[0];
        return (
            Object.entries(CODE.RATING)
                .slice(1)
                .reduce(
                    (ratingString, ratingCode) =>
                        ratingString + (Number(ratingCode[0]) <= Math.round(rating) ? ratingCode[1] : missCode),
                    ""
                ) +
            " " +
            ratingString
        );
    }
    static getParticipantsString(participants: Prostava["participants"], minCount: Prostava["participants_min_count"]) {
        const participantsWere = this.filterParticipantsWere(participants);
        let participantsString = participantsWere.reduce(
            (participantsString, participant) =>
                participantsString + (participant.user as User).personal_data.emoji + participant.rating,
            ""
        );
        if (participantsWere.length < minCount) {
            for (let i = 0; i < minCount - participantsWere.length; i++) {
                participantsString = participantsString + CODE.COMMAND.PROFILE + "0";
            }
        }
        return participantsString;
    }
    static getParticipantsVotesString(participantsCount: Prostava["participants_string"], participantsMaxCount: number) {
        return participantsCount + `/` + participantsMaxCount.toString();
    }
    static getVenueDisplayString(venue: Venue) {
        return (
            StringUtils.displayValue(venue?.location ? CODE.ACTION.PROSTAVA_LOCATION : "") +
            StringUtils.displayValue(venue?.title)
        );
    }

    static filterParticipantsWere(participants: Prostava["participants"]) {
        return participants.filter((participant) => participant.rating > 0);
    }
    static filterUserProstavas(prostavas: Group["prostavas"], userId: number) {
        return (prostavas as [Prostava]).filter((prostava) => this.isUserAuthorOfPrastava(prostava, userId));
    }
    static filterProstavasByQuery(prostavas: Group["prostavas"], query: string) {
        return this.filterCompletedProstavas(prostavas).filter((prostava) =>
            this.matchProstavaByQuery(prostava, query)
        );
    }
    static filterCompletedProstavas(prostavas: Group["prostavas"]) {
        return (prostavas as [Prostava]).filter((prostava) => this.isProstavaCompleted(prostava));
    }
    static matchProstavaByQuery(prostava: Prostava, query: string) {
        if (prostava.prostava_data.title.match(query)) {
            return true;
        }
        return false;
    }
    static isUserAuthorOfPrastava(prostava: Prostava, userId: number) {
        return (prostava.author as User).user_id === userId;
    }
    static isProstavaPendingCompleted(prostava: Prostava) {
        if (prostava?.participants?.length === prostava?.participants_max_count) {
            return true;
        }
        if (prostava?.closing_date?.getTime() <= Date.now()) {
            return true;
        }
        return false;
    }
    static isProstavaCompleted(prostava: Prostava) {
        return prostava?.status === ProstavaStatus.Approved || prostava?.status === ProstavaStatus.Rejected;
    }
    static isProstavaPending(prostava: Prostava) {
        return prostava?.status === ProstavaStatus.Pending;
    }
    static isProstavaNew(prostava: Prostava) {
        return prostava?.status === ProstavaStatus.New;
    }
}
