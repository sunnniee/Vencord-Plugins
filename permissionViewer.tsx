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

import { LazyComponent } from "@utils/misc.jsx";
import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal.jsx";
import { Queue } from "@utils/Queue";
import definePlugin from "@utils/types";
import { findByCode, findByPropsLazy, waitFor } from "@webpack";
import { ChannelStore, GuildStore, Menu, React, Text, Tooltip, UserStore, UserUtils } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";


let Permissions: Record<string, bigint>, computePermissions: ({ ...args }) => bigint;
waitFor(["VIEW_CREATOR_MONETIZATION_ANALYTICS"], m => Permissions = m);
waitFor(["canEveryoneRole"], m => ({ computePermissions } = m));
const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const OwnerCrown = LazyComponent(() => findByCode("M13.6572 5.42868C13.8879 5.29002"));
const OwnerCrownStyles = findByPropsLazy("ownerIcon", "avatarDecorationPadding");

function toTitleCase(str: string): string {
    return str.split("_")
        .map(seg => seg.charAt(0) + seg.slice(1).toLowerCase()).join(" ");
}

const ownerFetchQueue = new Queue();

function getPermissions(user: User, channel: Channel, guild?: Guild) {
    if (!channel) return 0n;
    guild ??= GuildStore.getGuild(channel.guild_id);
    if (!guild) return 0n;
    return computePermissions({ user, context: guild, overwrites: channel.permissionOverwrites });
}

interface PermissonsProps {
    permissions: bigint;
    [key: string]: any;
}
interface PermIconProps {
    variant: "allowed" | "denied";
    [key: string]: any;
}
interface GuildMenuProps {
    guild: Guild;
    [key: string]: any;
}

function makeRoleDot(color: number) {
    if (!color) return () => null;
    return () => <svg viewBox="0 0 12 12" height="12" width="12"><circle cx="6" cy="6" r="6" fill={"#" + color.toString(16)} /></svg>;
}

// this plugin is proof i shouldn't be allowed anywhere near react
const Components = {
    PermissionIcon(props: PermIconProps) {
        switch (props.variant) {
            case "allowed":
                return <svg height="36" viewBox="-4 -4 44 44" width="36"><path d="M0 0h36v36H0z" fill="none" /><path fill="#3ba55d" d="M13.5 24.255 7.245 18l-2.13 2.115L13.5 28.5 31.5 10.5l-2.115 -2.115z" /></svg>;
            case "denied":
            default: // will never happen but ts yells at me if i dont include it
                return <svg height="36" viewBox="-4 -4 56 56" width="36"><path d="M0 0h48v48H0z" fill="none" /><path fill="#ed4245" d="M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm0 36c-8.84 0-16-7.16-16-16 0-3.7 1.26-7.1 3.38-9.8L33.8 36.62C31.1 38.74 27.7 40 24 40zm12.62-6.2L14.2 11.38C16.9 9.26 20.3 8 24 8c8.84 0 16 7.16 16 16 0 3.7-1.26 7.1-3.38 9.8z" /></svg>;
        }

    },
    Separator: () => <div style={{ boxSizing: "border-box", margin: "2px", borderBottom: "1px solid var(--background-modifier-accent)" }} />,
    Padding: () => <div style={{ padding: "8px" }} />,
    UserAvatar: ({ user, guildId }: { user: User, guildId: string; }) =>
        <UserSummaryItem users={[user]} guildId={guildId} showDefaultAvatarsForNullUsers showUserPopout />,
    OwnerIcon: () => <Tooltip text={"Server Owner"}>
        {tooltipProps => <OwnerCrown className={OwnerCrownStyles.ownerIcon} {...tooltipProps} />}
    </Tooltip>,
    OwnerInfo: ({ guild }: { guild: Guild; }) => {
        const [ownerUser, setOwnerUser] = React.useState(UserStore.getUser(guild.ownerId) || null);
        if (!ownerUser) ownerFetchQueue.push(() => UserUtils.fetchUser(guild.ownerId)
            .then(user => setOwnerUser(user))
        );
        return <div style={{
            backgroundColor: "var(--background-secondary)",
            borderRadius: 8,
            padding: 2,
            margin: "0 4px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 4
        }}>
            <Components.OwnerIcon />
            <Components.UserAvatar user={ownerUser} guildId={guild.id} />
            {ownerUser
                ? <Text variant="text-md/bold" tag="span">{ownerUser.username}
                    <Text variant="text-md/bold" tag="span" color="text-muted">#{ownerUser.discriminator}</Text>
                </Text>
                : <Text variant="text-md/bold" tag="span">Loading</Text>
            }
        </div>;
    },
    Permissions: (props: PermissonsProps) => <>
        {Object.entries(Permissions).map(([perm, permInt]) =>
            <>
                <Text variant="text-md/semibold">
                    <Components.PermissionIcon variant={props.permissions & permInt ? "allowed" : "denied"} />
                    {toTitleCase(perm)}
                </Text>
                <Components.Separator />
            </>
        )}
        <Components.Padding />
    </>,
    GuildPermissions(props: GuildMenuProps) {
        const { guild } = props;
        const roles = Object.entries(guild.roles);
        const [role, setRole] = React.useState(roles[0][1].id);
        return <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "10px" }}>
            <div>
                <Menu.ContextMenu navId="roles" onClose={() => { }} hideScroller>
                    {Object.entries(guild.roles).map(([id, role]) =>
                        <Menu.MenuGroup key={id}>
                            <Menu.MenuItem
                                id={id}
                                key={id}
                                label={role.name}
                                icon={makeRoleDot(role.color)}
                                action={() => setRole(id)}
                            />
                        </Menu.MenuGroup>
                    )}
                </Menu.ContextMenu>
            </div>
            <div>
                <Text variant="text-lg/semibold">Permissions for {guild.roles[role].name}</Text>
                <Components.Permissions permissions={guild.roles[role].permissions} />
            </div>
        </div>;
    }
};

export default definePlugin({
    name: "PermissionViewer",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    description: "Allows you to view the permissions of a user/role",
    dependencies: ["MenuItemDeobfuscatorAPI"],
    patches: [{
        find: ".GUILD_CHANNEL_USER_MENU])",
        replacement: {
            match: /\.Fragment,{children:\[.{1,150}\[.{20,80}\]/,
            replace: "$&.concat([Vencord.Plugins.plugins.PermissionViewer.userMenuItem(arguments[0])])"
        }
    }, {
        find: "GuildContextMenu: user",
        replacement: {
            match: /children:\[.{1,2},__OVERLAY__.{1,20}\]/,
            replace: "$&.concat([Vencord.Plugins.plugins.PermissionViewer.guildMenuItem(arguments[0].guild)])"
        }
    }],

    userMenuItem(props: any): JSX.Element | null {
        const { channelId, user } = props;
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return null;
        const guild = GuildStore.getGuild(channel.guild_id);
        if (!guild) return null;
        return <Menu.MenuItem
            id="permissions"
            key="permissions"
            label="View Permissions"
            action={() => {
                const perms = getPermissions(user, channel, guild);
                openModal(modalProps =>
                    <ModalRoot size={ModalSize.SMALL} {...modalProps}>
                        <ModalHeader>
                            <Components.UserAvatar user={user as User} guildId={channel.guild_id} />
                            <Text variant="heading-md/bold" style={{ paddingLeft: 4 }}>
                                {user.username}
                                <Text variant="heading-md/bold" color="text-muted" tag="span">#{user.discriminator}</Text>
                            </Text>
                            {guild.ownerId === user.id && <Components.OwnerIcon />}
                        </ModalHeader>
                        <ModalContent>
                            <Components.Permissions permissions={perms} />
                        </ModalContent>
                    </ModalRoot>
                );
            }}
        />;
    },

    guildMenuItem(guild: Guild): JSX.Element | null {
        if (!guild) return null;
        return <Menu.MenuItem
            id="permissions"
            key="permissions"
            label="View Permissions"
            action={() => {
                openModal(modalProps =>
                    <ModalRoot size={ModalSize.LARGE} {...modalProps}>
                        <ModalHeader>
                            <img
                                src={`https://${window.GLOBAL_ENV.CDN_HOST}/icons/${guild.id}/${guild.icon}.png?size=32`}
                                width={32}
                                height={32}
                                style={{ borderRadius: "50%" }}
                            />
                            <Text variant="heading-md/bold" style={{ paddingLeft: 4 }}>{guild.name}</Text>
                            <Components.OwnerInfo guild={guild} />
                        </ModalHeader>
                        <ModalContent>
                            <Components.GuildPermissions guild={guild} />
                        </ModalContent>
                    </ModalRoot>
                );
            }}
        />;
    }
});
