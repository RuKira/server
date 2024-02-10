import { inject, injectable } from "tsyringe";

import { InventoryController } from "@spt-aki/controllers/InventoryController";
import { QuestController } from "@spt-aki/controllers/QuestController";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { IInventoryBindRequestData } from "@spt-aki/models/eft/inventory/IInventoryBindRequestData";
import { IInventoryCreateMarkerRequestData } from "@spt-aki/models/eft/inventory/IInventoryCreateMarkerRequestData";
import { IInventoryDeleteMarkerRequestData } from "@spt-aki/models/eft/inventory/IInventoryDeleteMarkerRequestData";
import { IInventoryEditMarkerRequestData } from "@spt-aki/models/eft/inventory/IInventoryEditMarkerRequestData";
import { IInventoryExamineRequestData } from "@spt-aki/models/eft/inventory/IInventoryExamineRequestData";
import { IInventoryFoldRequestData } from "@spt-aki/models/eft/inventory/IInventoryFoldRequestData";
import { IInventoryMergeRequestData } from "@spt-aki/models/eft/inventory/IInventoryMergeRequestData";
import { IInventoryMoveRequestData } from "@spt-aki/models/eft/inventory/IInventoryMoveRequestData";
import { IInventoryReadEncyclopediaRequestData } from "@spt-aki/models/eft/inventory/IInventoryReadEncyclopediaRequestData";
import { IInventoryRemoveRequestData } from "@spt-aki/models/eft/inventory/IInventoryRemoveRequestData";
import { IInventorySortRequestData } from "@spt-aki/models/eft/inventory/IInventorySortRequestData";
import { IInventorySplitRequestData } from "@spt-aki/models/eft/inventory/IInventorySplitRequestData";
import { IInventorySwapRequestData } from "@spt-aki/models/eft/inventory/IInventorySwapRequestData";
import { IInventoryTagRequestData } from "@spt-aki/models/eft/inventory/IInventoryTagRequestData";
import { IInventoryToggleRequestData } from "@spt-aki/models/eft/inventory/IInventoryToggleRequestData";
import { IInventoryTransferRequestData } from "@spt-aki/models/eft/inventory/IInventoryTransferRequestData";
import { IOpenRandomLootContainerRequestData } from "@spt-aki/models/eft/inventory/IOpenRandomLootContainerRequestData";
import { IRedeemProfileRequestData } from "@spt-aki/models/eft/inventory/IRedeemProfileRequestData";
import { ISetFavoriteItems } from "@spt-aki/models/eft/inventory/ISetFavoriteItems";
import { IItemEventRouterResponse } from "@spt-aki/models/eft/itemEvent/IItemEventRouterResponse";
import { IFailQuestRequestData } from "@spt-aki/models/eft/quests/IFailQuestRequestData";

@injectable()
export class InventoryCallbacks
{
    constructor(
        @inject("InventoryController") protected inventoryController: InventoryController,
        @inject("QuestController") protected questController: QuestController,
    )
    {}

    /** Handle client/game/profile/items/moving Move event */
    public moveItem(
        pmcData: IPmcData,
        body: IInventoryMoveRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        this.inventoryController.moveItem(pmcData, body, sessionID, output);

        return output;
    }

    /** Handle Remove event */
    public removeItem(
        pmcData: IPmcData,
        body: IInventoryRemoveRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.discardItem(pmcData, body, sessionID, output);
    }

    /** Handle Split event */
    public splitItem(
        pmcData: IPmcData,
        body: IInventorySplitRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.splitItem(pmcData, body, sessionID, output);
    }

    public mergeItem(
        pmcData: IPmcData,
        body: IInventoryMergeRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.mergeItem(pmcData, body, sessionID, output);
    }

    public transferItem(
        pmcData: IPmcData,
        body: IInventoryTransferRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.transferItem(pmcData, body, sessionID, output);
    }

    /** Handle Swap */
    // TODO: how is this triggered
    public swapItem(pmcData: IPmcData, body: IInventorySwapRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.swapItem(pmcData, body, sessionID);
    }

    public foldItem(pmcData: IPmcData, body: IInventoryFoldRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.foldItem(pmcData, body, sessionID);
    }

    public toggleItem(pmcData: IPmcData, body: IInventoryToggleRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.toggleItem(pmcData, body, sessionID);
    }

    public tagItem(pmcData: IPmcData, body: IInventoryTagRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.tagItem(pmcData, body, sessionID);
    }

    public bindItem(pmcData: IPmcData, body: IInventoryBindRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.bindItem(pmcData, body, sessionID);
    }

    public unbindItem(pmcData: IPmcData, body: IInventoryBindRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.inventoryController.unbindItem(pmcData, body, sessionID);
    }

    public examineItem(
        pmcData: IPmcData,
        body: IInventoryExamineRequestData,
        sessionID: string,
        output: IItemEventRouterResponse,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.examineItem(pmcData, body, sessionID, output);
    }

    /** Handle ReadEncyclopedia */
    public readEncyclopedia(
        pmcData: IPmcData,
        body: IInventoryReadEncyclopediaRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.readEncyclopedia(pmcData, body, sessionID);
    }

    /** Handle ApplyInventoryChanges */
    public sortInventory(
        pmcData: IPmcData,
        body: IInventorySortRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.sortInventory(pmcData, body, sessionID);
    }

    public createMapMarker(
        pmcData: IPmcData,
        body: IInventoryCreateMarkerRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.createMapMarker(pmcData, body, sessionID);
    }

    public deleteMapMarker(
        pmcData: IPmcData,
        body: IInventoryDeleteMarkerRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.deleteMapMarker(pmcData, body, sessionID);
    }

    public editMapMarker(
        pmcData: IPmcData,
        body: IInventoryEditMarkerRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.editMapMarker(pmcData, body, sessionID);
    }

    /** Handle OpenRandomLootContainer */
    public openRandomLootContainer(
        pmcData: IPmcData,
        body: IOpenRandomLootContainerRequestData,
        sessionID: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.openRandomLootContainer(pmcData, body, sessionID);
    }

    public redeemProfileReward(
        pmcData: IPmcData,
        body: IRedeemProfileRequestData,
        sessionId: string,
    ): IItemEventRouterResponse
    {
        return this.inventoryController.redeemProfileReward(pmcData, body, sessionId);
    }

    public setFavoriteItem(pmcData: IPmcData, body: ISetFavoriteItems, sessionId: string): IItemEventRouterResponse
    {
        return this.inventoryController.setFavoriteItem(pmcData, body, sessionId);
    }

    /**
     * TODO - MOVE INTO QUEST CODE
     * Handle game/profile/items/moving - QuestFail
     */
    public failQuest(pmcData: IPmcData, request: IFailQuestRequestData, sessionID: string): IItemEventRouterResponse
    {
        return this.questController.failQuest(pmcData, request, sessionID);
    }
}
