/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Channel, Message, User } from "discord-types/general";

import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { waitFor } from "../webpack";
import { GuildStore } from "../webpack/common";

let Permissions: Record<string, bigint>, computePermissions: ({ ...args }) => bigint,
    Tags: Record<string, number> /* really a Record<(string, number) | (number, string)> but not needed here*/;
waitFor(["VIEW_CREATOR_MONETIZATION_ANALYTICS"], m => Permissions = m);
waitFor(["canEveryoneRole"], m => ({ computePermissions } = m));
waitFor(m => m.Types?.[0] === "BOT", m => Tags = m.Types);

interface Tag {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
    botAndOpCases?: boolean;
    permissions?: string[];
    condition?: (message: Message | null, user: User, channel: Channel | undefined) => boolean;
}
const tags: Tag[] = [{
    name: "WEBHOOK",
    displayName: "Webhook",
    description: "Messages sent by webhooks",
    botAndOpCases: false,
    condition(message, user) {
        return message?.webhookId && user.isNonUserBot();
    }
}, {
    name: "OWNER",
    displayName: "Owner",
    description: "Owns the server",
    botAndOpCases: true,
    condition(_, user, channel) {
        return GuildStore.getGuild(channel?.guild_id)?.ownerId === user.id;
    }
}, {
    name: "ADMINISTRATOR",
    displayName: "Admin",
    description: "Has the administrator permission",
    botAndOpCases: true,
    permissions: ["ADMINISTRATOR"]
}, {
    name: "MODERATOR_STAFF",
    displayName: "Staff",
    description: "Can manage the server, channels or roles",
    botAndOpCases: true,
    permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS", "MANAGE_ROLES"]
}, {
    name: "MODERATOR",
    displayName: "Mod",
    description: "Can manage messages or kick/ban people",
    botAndOpCases: true,
    permissions: ["MANAGE_MESSAGES", "KICK_MEMBERS", "BAN_MEMBERS"]
    // reversed so higher entries have priority over lower entries
}].reverse();

// index used for assigning id's to tags
let i = 999;

export default definePlugin({
    name: "More Tags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.) (disable Webhook Tags first!)",
    authors: [Devs.Cyn, {
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    options: {
        showInMembersList: {
            description: "Show tags in member sidebar",
            type: OptionType.BOOLEAN,
            default: true
        },
        dontShowBotTag: {
            description: "Don't show \"BOT\" text for bots with other tags (verified bots will still have checkmark)",
            type: OptionType.BOOLEAN
        },
        ...Object.fromEntries(tags.map(t => [
            `showTag_${t.name}`, {
                description: `Show ${t.displayName} tags (${t.description})`,
                type: OptionType.BOOLEAN,
                default: true
            }
        ]))
    },
    patches: [
        {
            find: '.BOT=0]="BOT"',
            replacement: [
                {
                    match: /(.)\[.\.BOT=0\]="BOT";/,
                    replace: (orig, types) =>
                        `${tags.map(t =>
                            `${types}[${types}.${t.name}=${i--}]="${t.name}";\
${t.botAndOpCases ? `${types}[${types}.${t.name}_OP=${i--}]="${t.name}_OP";${types}[${types}.${t.name}_BOT=${i--}]="${t.name}_BOT";` : ""}`
                        ).join("")}${orig}`
                },
                {
                    match: /case (.)\.BOT:default:(.)=/,
                    replace: (orig, types, text) =>
                        `${tags.map(t =>
                            `case ${types}.${t.name}:${text}="${t.displayName}";break;\
${t.botAndOpCases ? `case ${types}.${t.name}_OP:${text}="OP • ${t.displayName}";break;case ${types}.${t.name}_BOT:${text}="BOT • ${t.displayName}";break;` : ""}`
                        ).join("")}${orig}`
                },
            ],
        },
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /return null==(.)\?null:.\.createElement\((.)\.Z/,
                replace: (orig, type) =>
                    `${type}=Vencord.Plugins.plugins["More Tags"].getTagForMessage(arguments[0],${type});${orig}`
            },
        },
        {
            find: ".renderBot=function(){",
            replacement: {
                match: /this.props.user;return null.{0,15}\?(.{0,50})\(\)\.botTag/,
                replace: "this.props.user;var type=Vencord.Plugins.plugins[\"More Tags\"].getTagForSidebar(this.props);return type!==null?$1().botTag,type"
            }
        }
    ],

    getPermissions(user: User, channel: Channel): string[] {
        if (!channel) return [];
        const guild = GuildStore.getGuild(channel.guild_id);
        if (!guild) return [];
        const permissions = computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
        return Object.entries(Permissions).map(([perm, permInt]) =>
            permissions & permInt ? perm : ""
        ).filter(i => i);
    },

    getTagForMessage(args: any, origType: number): number {
        const { message, user, channel } = args;
        let type = origType;
        const settings = Settings.plugins[this.name];
        const perms = this.getPermissions(user, channel);
        tags.forEach(tag => {
            if (`showTag_${tag.name}` in settings && !settings[`showTag_${tag.name}`]) return;
            if (tag.permissions?.find(perm => perms.includes(perm))
                || (tag.condition && tag.condition(message, user, channel))
            ) {
                if (channel?.isForumPost() && channel.ownerId === user.id) type = Tags[`${tag.name}_OP`];
                else if (user.bot && !settings.dontShowBotTag) type = Tags[`${tag.name}_BOT`];
                else type = Tags[tag.name];
                if (!tag.botAndOpCases) type = Tags[tag.name];
            }
        });
        return type;
    },

    getTagForSidebar(props: any): number | null {
        const { user, channel } = props;
        let botTag = user.bot ? Tags.BOT : null;
        const settings = Settings.plugins[this.name];
        if ("showInMembersList" in settings && !settings.showInMembersList) return botTag;
        const perms = this.getPermissions(user, channel);
        tags.forEach(tag => {
            if (`showTag_${tag.name}` in settings && !settings[`showTag_${tag.name}`]) return;
            if (tag.permissions?.find(perm => perms.includes(perm))
                || (tag.condition && tag.condition(null, user, channel))
            ) {
                if (user.bot && !settings.dontShowBotTag) botTag = Tags[`${tag.name}_BOT`];
                else botTag = Tags[tag.name];
                if (!tag.botAndOpCases) botTag = Tags[tag.name];
            }
        });
        return botTag;
    }
});
