---
title: How to Track Specific Buffs in Midnight
date: 2026-02-03
description: Through some clever use of filtering and knowledge of buff mechanics, certain specs can track buffs relevant to them very closely. This is how it works.
authors:
    - harrek
tags:
    - general
---

By now i have already made some waves due to my last attempt at solving this issue using texture replacement. While that solution "worked" (and was very funny to develop) the truth is it was very ugly and definitely not ideal for day to day gameplay. For my second attempt i have tried to color inside the lines much more and came up with a new solution. While this is not as fool-proof as the textures thing and is a little more limited, it is also much more reasonable and fits with that you would expect from an addon.

<!-- truncate -->

:::warning
This method depends on filters that come from Blizzard, the specific auras that the filter allows dictate how complicated it is to track a specific thing. For some specs it is just outright impossible as the filters might have too much stuff that is just very hard to parse. This also means at any point Blizzard might change some of the filters, and that can make it easier, harder, or impossible to track things.
:::

<VideoClip url="https://i.imgur.com/ErNx1qV.mp4" />

## Establishing Baselines

While this new method does work (or at least you could say it works 95% of the time) it also has its own drawbacks that need to be acknowledged. First of all just for the people that wonder about it, this is using functions and filters provided by Blizzard, i am not doing anything fishy here and they can kill this method at any moment if they so desire (the same was true for the texture method but some people didn't believe me).

With that out of the way, here are the relevant tidbits of information to start with:

- You can ask wow to give you a list of all the buffs any unit has but all the information you get back will be secret.
- You can *show* secrets, but you can't see what they are. I can display the icon of aura #1, but i can't know what the icon is or the id of the aura.
- When you ask for the list of buffs, you can also ask Blizzard to filter or sort them in certain ways. These filters are pre-programmed by blizzard, you can only tell them what filter and sorting method to use.
- You can know how many buffs in total there are in the list.

So then we need to figure out how to use these to our advantage. The next step requires knowing all of the auras that the filter we are gonna use lets through, and then some spec-specific knowledge to figure out if it is possible to track something based on the behavior of those auras. The filters vary wildly in how many things they have in them and the specs themselves are also complex on their own, so we are starting from a very complicated spot. To make our lives easier, lets list some things that are gonna be unavoidable:

- Some specs are not gonna have suitable filters. Tracking is just not possible for them.
- Each spec is gonna require a different method for tracking.
- We are gonna have to make some assumptions based on how we know the spells work.
- Even if we manage to do a very confident guess it is still a guess, false positives and false negatives might occur.

## The Resto Shaman Method

To start off with the easier one, Restoration Shaman is a very good candidate for this because it has one of the smallest filters. When asking for the buffs on a certain unit we can use `PLAYER|HELPFUL|RAID_IN_COMBAT` as a filter and this will only ever return !Riptide! and !Earth Shield! applied by us. This is the perfect setup for buff tracking because the list is very small and the spells on it behave very very differently, so we can differentiate them based on certain conditions.

For the people that don't play shaman !Earth Shield! can only ever go on two units: yourself and one ally, if you are talented into !Therazanes Resilience! (and you should be) it lasts for one hour and most people just put it on one unit and never move it. !Riptide! is the important buff we care about and want to track, this is a much harder one to follow because of all the different ways it can be applied, however because there are only two auras on the filter as long we can know who has !Earth Shield! we can know all the other auras have to be !Riptide!.

Here are the assumptions we are making for Restoration Shaman:

- The player will always have !Earth Shield! on themselves.
- One unit in the group will also have !Earth Shield!, we can assume this unit will keep the shield for a long period of time.

Every time we update auras on a unit we will get a result that can have 0, 1, or 2 results in it, and we also know what unit we are checking.

1) If the unit is the player and the result gave us back 2 auras then we know the player has !Riptide! because the other is !Earth Shield!, if the player only has 1 aura then that is our !Earth Shield! (in theory this could be !Riptide! if you forgot to apply !Earth Shield! to yourself, but this is a massive missplay anyway so you shouldn't find yourself in this situation)
2) If the unit is *not* the player and has 2 auras, then this unit has both our 2nd !Earth Shield! and a !Riptide!. Because we assume we won't be moving our !Earth Shield! around a lot we will save the id of this unit as "that guy with the earth shield" so we can reference that later.
3) If the unit is not the player and has 1 aura we check if this is that guy with the earth shield, if it is then the aura is just !Earth Shield!, if its not then this player has !Riptide!.
4) If there are 0 auras, then obviously there is no !Riptide!.

And so by knowing how !Earth Shield! behaves we can figure out who has a !Riptide! on them just by checking how many buffs we get back from the call. The code looks something like this:

```lua
auras = C_UnitAuras.GetUnitAuras(unit, 'PLAYER|HELPFUL|RAID_IN_COMBAT', 2, Enum.UnitAuraSortRule.ExpirationOnly)
if #auras == 2 then
    hasBuff = true
    if not isPlayer then
        util.earthShield = unit
    end
elseif #auras == 1 and not isPlayer and (util.earthShield == nil or util.earthShield ~= unit) then
    hasBuff = true
end
```

As an extra thing, we add `Enum.UnitAuraSortRule.ExpirationOnly` to sort the auras by their expiration time. Because !Riptide! lasts at most 24 seconds and !Earth Shield! up to one hour, we can be pretty confident that !Riptide! will be in front, and so we can use `auras[1]` to access its data like icon and remaining duration for display.

## The Discipline Priest Method

Moving one step up on the difficulty level, we are going to track Atonement. The first step is to check at the filter to see what we have to work with, and for this case we have a slightly larger list:

- Atonement
- Pain Suppression
- Power Word: Shield
- Void Shield

At first glance this seems complicated because we have several short duration buffs, however because it is specifically Atonement we care about we have a big advantage in that both Power Word: Shield and Void Shield apply atonement. The duration of all three buffs is the same, and while the shields might fade after taking certain amount of damage Atonement sticks for the whole duration.

There is one issue here, in the form of an Oracle talent called Unfolding Vision. This talent makes shields that expire without being fully consumed jump to a new target, which can cause a target to have one of the shields but not atonement. Sadly for the time being i can't think of a good, simple work around for this. There is probably a way to filter out most of these false positives by doing more detailed tracking and i do plan to explore that but for now i will simply make my life easier by assuming your shields are always fully consumed.

Pain Suppression also presents a challenge. It is a single target spell with a long cooldown so we could potentially not do anything and just live with our frames getting atonement-colored on people that have Pain Suppression too. We can also go a bit beyond and use another tool available to us to get more information on when we apply Pain Suppression: The information about your own spell casts is not secret.

With that, these are our assumptions for Discipline:

- If a unit has Power World: Shield or Void Shield, they also have Atonement
- If a unit has you Pain Suppression on them, this has to come from you casting the spell.

This is how it ends up working:

1) We track `UNIT_SPELLCAST_SUCCEEDED` events. If the unit causing them is the player then the information won't be secret so we can check what spell we casted, if it is Pain Suppression then we save the exact time when this happened.
2) When we see the `UNIT_AURA` event and go to update buffs for that unit, we check if this event is triggering at the same time as the cast time of Pain Suppression we have saved. If the times match exactly, we see check the information for what auras were added to this unit. If the unit gained a new aura from the player at the exact time we casted Pain Suppression, then we make the reasonable assumption that this aura we are seeing is that Pain Suppression, and we save the `auraInstanceID` (this field is never secret) on a table.
3) When we ask for the list of buffs, we limit the results to only one aura and sort them alphabetically. This means if atonement is present on the target it will be the first aura because it goes first alphabetically. Because Power Word: Shield and Void Shield can't be present on a unit that doesn't also have Atonement they will never be ahead of it, and the only other buff that might is Pain Suppression, however we have a list of all the `auraInstanceID`s of all the Pain Suppressions we have applied, so we can just compare our single aura with that list and if its not in it then that is an Atonement.

The code ends up like this:

```lua
local currentTime = GetTime()
--FilteredSpellTimestamp is our previously saved Pain Suppression cast, while updateInfo is the information inside the UNIT_AURA event
if currentTime == util.filteredSpellTimestamp and updateInfo.addedAuras then
    --This update is at the same time as Pain Sup cast and applied an aura
    for _, aura in ipairs(updateInfo.addedAuras) do
        if C_UnitAuras.IsAuraFilteredOutByInstanceID(unit, aura.auraInstanceID, 'PLAYER') then
            util.filteredSpells[aura.auraInstanceID] = unit
        end
    end
end
auras = C_UnitAuras.GetUnitAuras(unit, 'PLAYER|HELPFUL|RAID_IN_COMBAT', 1, Enum.UnitAuraSortRule.NameOnly)
if #auras == 1 and not util.filteredSpells[auras[1].auraInstanceID]  then
    hasBuff = true
end
```

To note, this might fail on different languages were the localized name of Atonement would put it behind one of the shields or Pain Suppression.

## The Preservation Evoker Method

So then we get to something even harder, we are going to track !Echo!. Same first step as before we look at the filter aaaaand:

- Echo
- Reversion
- Echo Reversion
- Dream Breath
- Echo Dream Breath
- Time Dilation

This is terrible. The `RAID_IN_COMBAT` filter has too much stuff that is too difficult to track. We could make an attempt but we have a ton of auras that get applied several different ways and some tied to casts of several different spells, the more complexity we add to the tracking the higher the likelihood of false triggers. `RAID_IN_COMBAT` is not the only filter that exists however, it is actually a new filter added on the Midnight beta with the intention of helping healers track their buffs (thanks Blizzard, we are doing it) but the quality (and ability to manipulate it) varies by spec as i mentioned before.

For the live game, we already have the simple `RAID` filter, which for Preservation currently has:

- Echo
- Reversion (only non-echo version)
- Source of Magic
- Time Dilation
- Zephyr

That is a *weird* filter, but it works much better for what we want which is auras that work very differently from what we want to track as much as possible. For this our only relevant assumption is that everything on the list besides Echo can only be on a unit after the player casts a specific spell. We try to detect these buffs the same way we did Pain Suppression, matching `auraInstanceIDs` applied at the exact same time the player did the cast and saving them on a list.

Zephyr presents a bigger challenge, because when cast it applies to four allies around you but your movement might cause it to jump to different players as people get closer and further away. What are we going to do for this? absolutely nothing, we will just live with a couple of false positives for the 8 seconds Zephyr is active every 2 minutes and be happy with it because it is still much better !Echo! tracking than what we had before

The code for this looks pretty much the same as it does for the Discipline Priest, the only difference is we have expanded the amount of spell casts we track from a single id to a list. This does add complexity and increases our chances for something to go wrong can cause a false positive (or a false negative, if you manage to cast one of the blacklisted spells at the exact same tenth of a second a flying !Temporal Anomaly! puts !Echo! on someone), but there is not a lot of ways around it if we want to single out !Echo! specifically. We also use alphabetical sorting for this because luckily !Echo! happens to be first on the list that way.

## Conclusions

The method works (with maybe some uncommon false positives every now and then), doesn't touch any textures nor destroy other parts of your ui, it tries to be performant by only updating the auras on a unit when that unit has actually gotten changes, and once the detection is done you can display it in pretty much whatever way you want. It is not perfect still and relies on Blizzard keeping the filters the way they currently are (or updating the filters for the other specs to allow this as well), but it is another way we have to actually see which unit has the buffs we care about, and for me that is enough.

I am still working on things, if there are new methods to track buffs in the future i will be very happy to look into them but while we are heavily restricted this is what we are dealing with and we will have to make do with that we have. I am also looking for feedback on how reliable the tracking is when you push the more complex versions of it on very busy encounter situations, if you want to try it for yourself you can get [the beta version of Harrek's Advanced Raid Frames on curse](https://www.curseforge.com/wow/addons/harreks-advanced-raid-frames) (but do note that the tracking only works on the beta at the moment, due to the `RAID_IN_COMBAT` filter not being present on the live game yet).

Good luck!