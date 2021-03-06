import { PROSTAVA, CALENDAR } from "../constants";
import { CommonMiddleware, GroupMiddleware, ProstavaMiddleware } from "../middlewares";
import { CommonController, ProstavaController } from "../controllers";
import { RegexUtils } from "../utils";
import { Scenes } from "telegraf";
import { UpdateContext } from "../types";
import { CommonScene } from "./common";
import { prostavaCalendar } from "../commons/calendar";

export const prostavaScene = new Scenes.BaseScene<UpdateContext>(PROSTAVA.SCENE.PROSTAVA);

prostavaScene.enter(
    ProstavaMiddleware.addPendingProstavaToContext,
    ProstavaMiddleware.addNewProstavaToContext,
    ProstavaMiddleware.saveProstava,
    GroupMiddleware.saveGroup,
    ProstavaController.showRateProstava,
    ProstavaController.showSelectProstava,
    ProstavaController.showCreateProstava,
    Scenes.Stage.leave<UpdateContext>()
);
prostavaScene.use(
    CommonMiddleware.isCbMessageOrigin,
    ProstavaMiddleware.addPendingProstavaToContext,
    ProstavaMiddleware.addNewProstavaToContext,
    ProstavaMiddleware.saveProstava
);

//Prostava
prostavaScene.action(
    RegexUtils.matchAction(PROSTAVA.ACTION.PROSTAVA_PROSTAVA),
    ProstavaMiddleware.addProstavaFromSelectActionToContext,
    ProstavaController.backToCreateProstava
);

//Author
prostavaScene.action(RegexUtils.matchAction(PROSTAVA.ACTION.PROSTAVA_AUTHOR), ProstavaController.showProstavaAuthors);
prostavaScene.action(
    RegexUtils.matchAction(PROSTAVA.ACTION.PROFILES_USER),
    ProstavaMiddleware.changeProstavaAuthor,
    ProstavaController.backToCreateProstava
);

//Type
prostavaScene.action(
    RegexUtils.matchAction(PROSTAVA.ACTION.PROSTAVA_TYPE),
    ProstavaMiddleware.isUserCreatorOfProstava,
    ProstavaController.showProstavaTypes
);
prostavaScene.action(
    RegexUtils.matchSubAction(PROSTAVA.ACTION.PROSTAVA_TYPE),
    ProstavaMiddleware.changeProstavaType,
    ProstavaController.backToCreateProstava
);

//Title Venue
CommonScene.actionInputRequest(prostavaScene, PROSTAVA.ACTION.PROSTAVA_TITLE);
CommonScene.actionInputRequest(prostavaScene, PROSTAVA.ACTION.PROSTAVA_VENUE);
prostavaScene.hears(
    RegexUtils.matchTitle(),
    CommonMiddleware.checkStateAction([PROSTAVA.ACTION.PROSTAVA_TITLE, PROSTAVA.ACTION.PROSTAVA_VENUE]),
    ProstavaMiddleware.changeProstavaOrVenueTitle,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);
prostavaScene.on(
    "venue",
    CommonMiddleware.checkStateAction([PROSTAVA.ACTION.PROSTAVA_VENUE]),
    ProstavaMiddleware.changeProstavaVenue,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);
prostavaScene.on(
    "location",
    CommonMiddleware.checkStateAction([PROSTAVA.ACTION.PROSTAVA_VENUE]),
    ProstavaMiddleware.changeProstavaLocation,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);

//Date and Time
prostavaScene.action(RegexUtils.matchAction(PROSTAVA.ACTION.PROSTAVA_DATE), ProstavaController.showProstavaCalendar);
prostavaScene.action(
    RegexUtils.matchCalendarAction(CALENDAR.ACTION.CALENDAR_DATE),
    ProstavaMiddleware.changeProstavaDate
);
prostavaCalendar.setBot(prostavaScene);
prostavaCalendar.setDateListener(ProstavaController.backToCreateProstava);
CommonScene.actionInputRequest(prostavaScene, PROSTAVA.ACTION.PROSTAVA_TIME);
prostavaScene.hears(
    RegexUtils.matchTime(),
    CommonMiddleware.checkStateAction([PROSTAVA.ACTION.PROSTAVA_TIME]),
    ProstavaMiddleware.changeProstavaTime,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);

//Cost
CommonScene.actionInputRequest(prostavaScene, PROSTAVA.ACTION.PROSTAVA_COST);
prostavaScene.hears(
    RegexUtils.matchCost(),
    CommonMiddleware.checkStateAction([PROSTAVA.ACTION.PROSTAVA_COST]),
    ProstavaMiddleware.changeProstavaCost,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);

//Create prostava
prostavaScene.action(
    RegexUtils.matchAction(PROSTAVA.ACTION.PROSTAVA_CREATE),
    ProstavaMiddleware.canAnnounceProstava,
    ProstavaMiddleware.announceProstava,
    CommonController.enterScene(PROSTAVA.SCENE.PROSTAVA)
);

//Back
CommonScene.actionBack(prostavaScene, ProstavaController.backToSelectProstava);
//Exit
CommonScene.actionExit(prostavaScene);
//Hide
prostavaScene.leave(CommonController.hideScene);
