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

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

import { Settings } from "../Vencord";

let Permissions: Record<string, bigint>, computePermissions: ({ ...args }) => bigint,
    Tags: Record<string, number>;
waitFor(["VIEW_CREATOR_MONETIZATION_ANALYTICS"], m => Permissions = m);
waitFor(["canEveryoneRole"], m => ({ computePermissions } = m));
waitFor(m => m.Types?.[0] === "BOT", m => Tags = m.Types);

interface Tag {
    // name used for identifying, must be alphanumeric + underscores
    name: string;
    // name shown on the tag itself, can be anything probably; automatically uppercase'd
    displayName: string;
    description: string;
    botAndOpCases: boolean;
    permissions?: string[];
    condition?: (message: Message | null, user: User, channel: Channel) => boolean;
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

// becuase channel id isn't available in user poputs by default where the tag is rendered
const passChannelIdDownProps = [
    {
        find: ".hasAvatarForGuild(null==",
        replacement: {
            match: /\(\).usernameSection,user/,
            replace: "().usernameSection,moreTags_channelId:arguments[0].channelId,user"
        }
    },
    {
        find: "().copiableNameTag",
        replacement: {
            match: /discriminatorClass:(.{1,100}),botClass:/,
            replace: "discriminatorClass:$1,moreTags_channelId:arguments[0].moreTags_channelId,botClass:"
        }
    }
];

export default definePlugin({
    name: "More Tags",
    description: "Adds tags for webhooks and moderative roles (owner, admin, etc.) (disable Webhook Tags first!)",
    authors: [Devs.Cyn, {
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    options: {
        dontShowBotTag: {
            description: "Don't show \"BOT\" text for bots with other tags (verified bots will still have checkmark)",
            type: OptionType.BOOLEAN
        },
        ...Object.fromEntries(tags.map(t => [
            `visibility_${t.name}`, {
                description: `Show ${t.displayName} tags (${t.description})`,
                type: OptionType.SELECT,
                options: [{
                    label: "Always",
                    value: "always",
                    default: true
                }, {
                    label: "Only in chat",
                    value: "chat"
                }, {
                    label: "Only in memeber list and profiles",
                    value: "not-chat"
                }, {
                    label: "Never",
                    value: "never"
                }]
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
                        // e[e.BOT=0]="BOT";
                        `${tags.map(t =>
                            `${types}[${types}.${t.name}=${i--}]="${t.name}";\
${t.botAndOpCases ? `${types}[${types}.${t.name}_OP=${i--}]="${t.name}_OP";${types}[${types}.${t.name}_BOT=${i--}]="${t.name}_BOT";` : ""}`
                        ).join("")}${orig}`
                },
                {
                    match: /case (.)\.BOT:default:(.)=(.{1,20})\.BOT/,
                    replace: (orig, types, text, strings) =>
                        `${tags.map(t =>
                            // case r.SERVER:T = c.Z.Messages.BOT_TAG_SERVER;break;
                            `case ${types}.${t.name}:${text}="${t.displayName}";break;\
${t.botAndOpCases ? `case ${types}.${t.name}_OP:${text}=${strings}.BOT_TAG_FORUM_ORIGINAL_POSTER+" • ${t.displayName}";break;\
case ${types}.${t.name}_BOT:${text}=${strings}.BOT_TAG_BOT+" • ${t.displayName}";break;` : ""}`
                        ).join("")}${orig}`
                },
            ],
        },
        // messages
        {
            find: ".Types.ORIGINAL_POSTER",
            replacement: {
                match: /return null==(.{1,2})\?null:\(0,/,
                replace: (orig, type) => `${type}=Vencord.Plugins.plugins["More Tags"]\
.getTag({...arguments[0],origType:${type},location:"chat"});${orig}`
            }
        },
        // member list
        {
            find: ".renderBot=function(){",
            replacement: {
                match: /this.props.user;return null!=(.{1,2})&&.{0,10}\?(.{0,50})\(\)\.botTag/,
                replace: "this.props.user;var type=Vencord.Plugins.plugins[\"More Tags\"]\
.getTag({...this.props,origType:$1.bot?0:null,location:'not-chat'});\
return type!==null?$2().botTag,type"
            }
        },
        // in profiles
        {
            find: ",botType:",
            replacement: {
                match: /,botType:(.{1,2}\((.{1,2})\)),/,
                replace: ",botType:Vencord.Plugins.plugins[\"More Tags\"]\
.getTag({user:$2,channelId:arguments[0].moreTags_channelId,origType:$1,location:'not-chat'}),"
            }
        },
        ...passChannelIdDownProps
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

    getTag(args: any): number | null {
        // note: everything other than user and location can be undefined
        const { message, user, channel, channelId, origType, location } = args;
        let type = typeof origType === "number" ? origType : null;
        // "as any" cast because the Channel type doesn't have .isForumPost() yet
        const actualChannel = channel ?? ChannelStore.getChannel(channelId) as any;
        if (!actualChannel) return type;

        const settings = Settings.plugins[this.name];
        const perms = this.getPermissions(user, actualChannel);

        tags.forEach(tag => {
            if (![location, "always"].includes(settings[`visibility_${tag.name}`])) return;
            if (tag.permissions?.find(perm => perms.includes(perm))
                || (tag.condition && tag.condition(message, user, actualChannel))
            ) {
                if (!tag.botAndOpCases) {
                    type = Tags[tag.name];
                    return;
                }
                if (actualChannel.isForumPost() && actualChannel.ownerId === user.id) type = Tags[`${tag.name}_OP`];
                else if (user.bot && !settings.dontShowBotTag) type = Tags[`${tag.name}_BOT`];
                else type = Tags[tag.name];
            }
        });
        return type;
    }
});
