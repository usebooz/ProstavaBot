import ical, { ICalAlarmType } from "ical-generator";
import { Request, Response } from "express";
import { Prostava, User } from "../types";
import { GroupUtils, ProstavaUtils } from "../utils";
import { i18n } from "../commons/locale";
import { CalendarView } from "../views";
import { DateTime } from "luxon";

export class CalendarController {
    static async sendGroupCalendarOfProstavas(req: Request, res: Response) {
        try {
            const group = await GroupUtils.findGroupByChatIdFromDB(Number(req.params.groupId));
            if (!group) {
                throw new Error(`Not found groupId ${req.params.groupId}`);
            }
            GroupUtils.populateGroupProstavas(group);
            const i18nContext = i18n.createContext(group.settings.language, {});
            const calendar = ical(CalendarView.getGroupCalendar(group));
            (ProstavaUtils.filterScheduledProstavas(group.prostavas) as Prostava[]).forEach((prostava) => {
                const event = calendar.createEvent(CalendarView.getProstavaEvent(prostava, i18nContext));
                prostava.participants.forEach((participant) => {
                    event.createAttendee(CalendarView.getParticipantAttendee(participant));
                });
                (ProstavaUtils.filterUsersPendingToRateProstava(group.users, prostava) as User[]).forEach((user) => {
                    event.createAttendee(CalendarView.getUserAttendee(user));
                });
                //TODO Default alarm
                event.createAlarm({
                    type: ICalAlarmType.display,
                    trigger: DateTime.fromJSDate(prostava.prostava_data.date).minus({ day: 1 })
                });
            });
            calendar.serve(res, `${req.params.groupId}.ics`);
        } catch (err) {
            console.log(err);
            res.sendStatus(404);
        }
    }

    static async redirectToAppleCalendar(req: Request, res: Response) {
        res.redirect(`webcal://${req.headers.host}/api/calendar/${req.params.groupId}.ics`);
    }

    static async redirectToGoogleCalendar(req: Request, res: Response) {
        res.redirect(
            `https://calendar.google.com/calendar/u/0/r/month?cid=http://${req.headers.host}/api/calendar/${req.params.groupId}.ics`
        );
    }
}
