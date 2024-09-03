import { HideoutHelper } from "@spt/helpers/HideoutHelper";
import { InventoryHelper } from "@spt/helpers/InventoryHelper";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { PresetHelper } from "@spt/helpers/PresetHelper";
import { ProfileHelper } from "@spt/helpers/ProfileHelper";
import { IPmcData } from "@spt/models/eft/common/IPmcData";
import { Item } from "@spt/models/eft/common/tables/IItem";
import { IStageRequirement } from "@spt/models/eft/hideout/IHideoutArea";
import { IHideoutCircleOfCultistProductionStartRequestData } from "@spt/models/eft/hideout/IHideoutCircleOfCultistProductionStartRequestData";
import { IRequirementBase, Requirement } from "@spt/models/eft/hideout/IHideoutProduction";
import { IItemEventRouterResponse } from "@spt/models/eft/itemEvent/IItemEventRouterResponse";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";
import { HideoutAreas } from "@spt/models/enums/HideoutAreas";
import { ItemTpl } from "@spt/models/enums/ItemTpl";
import { SkillTypes } from "@spt/models/enums/SkillTypes";
import { IHideoutConfig } from "@spt/models/spt/config/IHideoutConfig";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { EventOutputHolder } from "@spt/routers/EventOutputHolder";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ItemFilterService } from "@spt/services/ItemFilterService";
import { HashUtil } from "@spt/utils/HashUtil";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { ICloner } from "@spt/utils/cloners/ICloner";
import { inject, injectable } from "tsyringe";

@injectable()
export class CircleOfCultistService {
    protected static circleOfCultistSlotId = "CircleOfCultistsGrid1";
    protected hideoutConfig: IHideoutConfig;

    constructor(
        @inject("PrimaryLogger") protected logger: ILogger,
        @inject("PrimaryCloner") protected cloner: ICloner,
        @inject("EventOutputHolder") protected eventOutputHolder: EventOutputHolder,
        @inject("RandomUtil") protected randomUtil: RandomUtil,
        @inject("HashUtil") protected hashUtil: HashUtil,
        @inject("ItemHelper") protected itemHelper: ItemHelper,
        @inject("PresetHelper") protected presetHelper: PresetHelper,
        @inject("ProfileHelper") protected profileHelper: ProfileHelper,
        @inject("InventoryHelper") protected inventoryHelper: InventoryHelper,
        @inject("HideoutHelper") protected hideoutHelper: HideoutHelper,
        @inject("DatabaseService") protected databaseService: DatabaseService,
        @inject("ItemFilterService") protected itemFilterService: ItemFilterService,
        @inject("ConfigServer") protected configServer: ConfigServer,
    ) {
        this.hideoutConfig = this.configServer.getConfig(ConfigTypes.HIDEOUT);
    }

    /**
     * Start a sacrifice event
     * Generate rewards
     * Delete sacrificed items
     * @param sessionId Session id
     * @param pmcData Player profile doing sacrifice
     * @param request Client request
     * @returns IItemEventRouterResponse
     */
    public startSacrifice(
        sessionId: string,
        pmcData: IPmcData,
        request: IHideoutCircleOfCultistProductionStartRequestData,
    ): IItemEventRouterResponse {
        const cultistCircleStashId = pmcData.Inventory.hideoutAreaStashes[HideoutAreas.CIRCLE_OF_CULTISTS];

        // Sparse, just has id
        const cultistCraftData = this.databaseService.getHideout().production.cultistRecipes[0];
        const sacrificedItems: Item[] = this.getSacrificedItems(pmcData);
        const sacrificedItemCostRoubles = sacrificedItems.reduce(
            (sum, curr) => sum + (this.itemHelper.getItemPrice(curr._tpl) ?? 0),
            0,
        );

        // Get a randomised value to multiply the sacrificed rouble cost by
        let rewardAmountMultiplier = this.randomUtil.getFloat(
            this.hideoutConfig.cultistCircle.rewardPriceMultiplerMinMax.min,
            this.hideoutConfig.cultistCircle.rewardPriceMultiplerMinMax.max,
        );

        // Adjust the above value generated by the players hideout mgmt skill
        const hideoutManagementSkill = this.profileHelper.getSkillFromProfile(pmcData, SkillTypes.HIDEOUT_MANAGEMENT);
        if (hideoutManagementSkill) {
            rewardAmountMultiplier *= 1 + hideoutManagementSkill.Progress / 10000; // 5100 becomes 0.51, add 1 to it, 1.51, multiply the bonus by it (e.g. 1.2 x 1.51)
        }

        // Get the rouble amount we generate rewards with from cost of sacrified items * above multipler
        const rewardAmountRoubles = sacrificedItemCostRoubles * rewardAmountMultiplier;

        // Create production in pmc profile
        this.hideoutHelper.registerCircleOfCultistProduction(sessionId, pmcData, cultistCraftData._id, sacrificedItems);

        const output = this.eventOutputHolder.getOutput(sessionId);

        // Remove sacrified items
        for (const item of sacrificedItems) {
            if (item.slotId === CircleOfCultistService.circleOfCultistSlotId) {
                this.inventoryHelper.removeItem(pmcData, item._id, sessionId, output);
            }
        }

        // Player has sacrified a single item that's in directReward dict, return specific reward pool
        let rewards: Item[][];
        if (sacrificedItems.length === 1 && this.hideoutConfig.cultistCircle.directRewards[sacrificedItems[0]._tpl]) {
            rewards = this.getExplicitRewards(
                this.hideoutConfig.cultistCircle.directRewards[sacrificedItems[0]._tpl],
                cultistCircleStashId,
            );
        } else {
            const rewardItemPool = this.getCultistCircleRewardPool(sessionId, pmcData);
            this.logger.warning(`Reward pool item count: ${rewardItemPool.length}`);

            rewards = this.getRewardsWithinBudget(rewardItemPool, rewardAmountRoubles, cultistCircleStashId);
        }

        // Get the container grid for cultist stash area
        const cultistStashDbItem = this.itemHelper.getItem(ItemTpl.HIDEOUTAREACONTAINER_CIRCLEOFCULTISTS_STASH_1);

        // Ensure items fit into container
        const containerGrid = this.inventoryHelper.getContainerSlotMap(cultistStashDbItem[1]._id);
        const canAddToContainer = this.inventoryHelper.canPlaceItemsInContainer(
            this.cloner.clone(containerGrid), // MUST clone grid before passing in as function modifies grid
            rewards,
        );

        if (canAddToContainer) {
            for (const itemToAdd of rewards) {
                this.logger.warning(`Placing reward: ${itemToAdd[0]._tpl} in circle grid`);
                this.inventoryHelper.placeItemInContainer(
                    containerGrid,
                    itemToAdd,
                    cultistCircleStashId,
                    CircleOfCultistService.circleOfCultistSlotId,
                );

                // Add item + mods to output and profile inventory
                output.profileChanges[sessionId].items.new.push(...itemToAdd);
                pmcData.Inventory.items.push(...itemToAdd);
            }
        } else {
            this.logger.error(
                `Unable to fit all: ${rewards.length} reward items into sacrifice grid, nothing will be returned`,
            );
        }

        return output;
    }

    /**
     * Get the items player sacrificed in circle
     * @param pmcData Player profile
     * @returns Array of its from player inventory
     */
    protected getSacrificedItems(pmcData: IPmcData): Item[] {
        // Get root items that are in the cultist sacrifice window
        const inventoryRootItemsInCultistGrid = pmcData.Inventory.items.filter(
            (item) => item.slotId === CircleOfCultistService.circleOfCultistSlotId,
        );

        // Get rootitem + its children
        const sacrificedItems: Item[] = [];
        for (const rootItem of inventoryRootItemsInCultistGrid) {
            const rootItemWithChildren = this.itemHelper.findAndReturnChildrenAsItems(
                pmcData.Inventory.items,
                rootItem._id,
            );
            sacrificedItems.push(...rootItemWithChildren);
        }

        return sacrificedItems;
    }

    /**
     * Given a pool of items + rouble budget, pick items until the budget is reached
     * @param rewardItemTplPool Items that can be picekd
     * @param rewardBudget Rouble budget to reach
     * @param cultistCircleStashId Id of stash item
     * @returns Array of item arrays
     */
    protected getRewardsWithinBudget(
        rewardItemTplPool: string[],
        rewardBudget: number,
        cultistCircleStashId: string,
    ): Item[][] {
        // Prep rewards array (reward can be item with children, hence array of arrays)
        const rewards: Item[][] = [];

        // Pick random rewards until we have exhausted the sacrificed items budget
        let totalCost = 0;
        let itemsRewardedCount = 0;
        let failedAttempts = 0;
        while (
            totalCost < rewardBudget &&
            rewardItemTplPool.length > 0 &&
            itemsRewardedCount < this.hideoutConfig.cultistCircle.maxRewardItemCount
        ) {
            if (failedAttempts > this.hideoutConfig.cultistCircle.maxAttemptsToPickRewardsWithinBudget) {
                this.logger.warning(`Exiting reward generation after ${failedAttempts} failed attempts`);

                break;
            }

            // Choose a random tpl from pool
            const randomItemTplFromPool = this.randomUtil.getArrayValue(rewardItemTplPool);

            // Is weapon/armor, handle differently
            if (
                this.itemHelper.armorItemHasRemovableOrSoftInsertSlots(randomItemTplFromPool) ||
                this.itemHelper.isOfBaseclass(randomItemTplFromPool, BaseClasses.WEAPON)
            ) {
                const defaultPreset = this.presetHelper.getDefaultPreset(randomItemTplFromPool);
                if (!defaultPreset) {
                    this.logger.warning(`Reward tpl: ${randomItemTplFromPool} lacks a default preset, skipping reward`);
                    failedAttempts++;

                    continue;
                }

                // Ensure preset has unique ids and is cloned so we don't alter the preset data stored in memory
                const presetAndMods: Item[] = this.itemHelper.replaceIDs(defaultPreset._items);

                this.itemHelper.remapRootItemId(presetAndMods);

                itemsRewardedCount++;
                totalCost += this.itemHelper.getItemPrice(randomItemTplFromPool);
                rewards.push(presetAndMods);

                continue;
            }

            // Some items can have variable stack size, e.g. ammo
            const stackSize = this.getRewardStackSize(randomItemTplFromPool);

            // Not a weapon/armor, standard single item
            const rewardItem: Item = {
                _id: this.hashUtil.generate(),
                _tpl: randomItemTplFromPool,
                parentId: cultistCircleStashId,
                slotId: CircleOfCultistService.circleOfCultistSlotId,
                upd: {
                    StackObjectsCount: stackSize,
                    SpawnedInSession: true,
                },
            };

            // Increment price of rewards to give to player and add to reward array
            itemsRewardedCount++;
            totalCost += this.itemHelper.getItemPrice(randomItemTplFromPool);
            rewards.push([rewardItem]);
        }
        this.logger.warning(`Circle will reward ${itemsRewardedCount} items costing a total of ${totalCost} roubles`);

        return rewards;
    }

    /**
     * Give every item as a reward that's passed in
     * @param rewardTpls Item tpls to turn into reward items
     * @param cultistCircleStashId Id of stash item
     * @returns Array of item arrays
     */
    protected getExplicitRewards(rewardTpls: string[], cultistCircleStashId: string): Item[][] {
        // Prep rewards array (reward can be item with children, hence array of arrays)
        const rewards: Item[][] = [];
        for (const rewardTpl of rewardTpls) {
            if (
                this.itemHelper.armorItemHasRemovableOrSoftInsertSlots(rewardTpl) ||
                this.itemHelper.isOfBaseclass(rewardTpl, BaseClasses.WEAPON)
            ) {
                const defaultPreset = this.presetHelper.getDefaultPreset(rewardTpl);
                if (!defaultPreset) {
                    this.logger.warning(`Reward tpl: ${rewardTpl} lacks a default preset, skipping reward`);

                    continue;
                }

                // Ensure preset has unique ids and is cloned so we don't alter the preset data stored in memory
                const presetAndMods: Item[] = this.itemHelper.replaceIDs(defaultPreset._items);

                this.itemHelper.remapRootItemId(presetAndMods);

                rewards.push(presetAndMods);

                continue;
            }

            // Some items can have variable stack size, e.g. ammo
            const stackSize = this.getRewardStackSize(rewardTpl);

            // Not a weapon/armor, standard single item
            const rewardItem: Item = {
                _id: this.hashUtil.generate(),
                _tpl: rewardTpl,
                parentId: cultistCircleStashId,
                slotId: CircleOfCultistService.circleOfCultistSlotId,
                upd: {
                    StackObjectsCount: stackSize,
                    SpawnedInSession: true,
                },
            };

            rewards.push([rewardItem]);
        }

        return rewards;
    }

    /**
     * Get the size of a reward items stack
     * 1 for everything except ammo, ammo can be between min stack and max stack
     * @param itemTpl Item chosen
     * @returns Size of stack
     */
    protected getRewardStackSize(itemTpl: string) {
        if (this.itemHelper.isOfBaseclass(itemTpl, BaseClasses.AMMO)) {
            const ammoTemplate = this.itemHelper.getItem(itemTpl)[1];
            return this.itemHelper.getRandomisedAmmoStackSize(ammoTemplate);
        }

        return 1;
    }

    /**
     * Get a pool of tpl IDs of items the player needs to complete hideout crafts/upgrade areas
     * @param sessionId Session id
     * @param pmcData Profile of player who will be getting the rewards
     * @returns Array of tpls
     */
    protected getCultistCircleRewardPool(sessionId: string, pmcData: IPmcData): string[] {
        const rewardPool = new Set<string>();
        const cultistCircleConfig = this.hideoutConfig.cultistCircle;
        const hideoutDbData = this.databaseService.getHideout();

        // Merge reward item blacklist with cultist circle blacklist from config
        const itemRewardBlacklist = [
            ...this.itemFilterService.getItemRewardBlacklist(),
            ...cultistCircleConfig.rewardItemBlacklist,
        ];

        // What does player need to upgrade hideout areas
        const dbAreas = hideoutDbData.areas;
        for (const area of pmcData.Hideout.Areas) {
            const currentStageLevel = area.level;
            const areaType = area.type;

            // Get next stage of area
            const dbArea = dbAreas.find((area) => area.type === areaType);
            const nextStageDbData = dbArea.stages[currentStageLevel + 1];
            if (nextStageDbData) {
                // Next stage exists, gather up requirements and add to pool
                const itemRequirements = this.getItemRequirements(nextStageDbData.requirements);
                for (const rewardToAdd of itemRequirements) {
                    if (!itemRewardBlacklist.includes(rewardToAdd.templateId)) {
                        continue;
                    }

                    rewardPool.add(rewardToAdd.templateId);
                }
            }
        }

        // What does player need to start crafts with
        const playerUnlockedRecipes = pmcData.UnlockedInfo.unlockedProductionRecipe;
        const allRecipes = hideoutDbData.production;

        // Get default unlocked recipes + locked recipes they've unlocked
        const playerAccessibleRecipes = allRecipes.recipes.filter(
            (recipe) => !recipe.locked || playerUnlockedRecipes.includes(recipe._id),
        );
        for (const recipe of playerAccessibleRecipes) {
            const itemRequirements = this.getItemRequirements(recipe.requirements);
            for (const requirement of itemRequirements) {
                if (!itemRewardBlacklist.includes(requirement.templateId)) {
                    continue;
                }

                rewardPool.add(requirement.templateId);
            }
        }

        // Check for scav case unlock in profile
        const hasScavCaseAreaUnlocked = pmcData.Hideout.Areas[HideoutAreas.SCAV_CASE]?.level > 0;
        if (hasScavCaseAreaUnlocked) {
            // Gather up items used to start scav case crafts
            const scavCaseCrafts = hideoutDbData.scavcase;
            for (const craft of scavCaseCrafts) {
                // Find the item requirements from each craft
                const itemRequirements = this.getItemRequirements(craft.Requirements);
                for (const requirement of itemRequirements) {
                    if (!itemRewardBlacklist.includes(requirement.templateId)) {
                        continue;
                    }

                    // Add tpl to reward pool
                    rewardPool.add(requirement.templateId);
                }
            }
        }

        // Add custom rewards from config
        if (cultistCircleConfig.additionalRewardItemPool.length > 0) {
            for (const additionalReward of cultistCircleConfig.additionalRewardItemPool) {
                if (!itemRewardBlacklist.includes(additionalReward)) {
                    continue;
                }

                // Add tpl to reward pool
                rewardPool.add(additionalReward);
            }
        }

        return Array.from(rewardPool);
    }

    /**
     * Iterate over passed in hideout requirements and return the Item
     * @param requirements Requirements to iterate over
     * @returns Array of item requirements
     */
    protected getItemRequirements(requirements: IRequirementBase[]): (IStageRequirement | Requirement)[] {
        return requirements.filter((requirement) => requirement.type === "Item");
    }
}
