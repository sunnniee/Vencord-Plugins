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

import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { waitFor } from "../webpack";
import { React } from "../webpack/common";

const statuses = ["online", "idle", "dnd", "offline"] as const;
const colors: { [k in StatusType]: string } = {
    online: "#3ba55d",
    idle: "#faa81a",
    dnd: "#ed4245",
    offline: "#747f8d"
};

type StatusType = typeof statuses[number];
interface Status {
    desktop?: StatusType,
    mobile?: StatusType,
    web?: StatusType;
}

interface Decorations {
    0: any,
    1: JSX.Element[];
}

// leaving this here in case there's ever a way to check input before save
// ty stackoverflow
// const colorRegex = /^(#[a-f0-9]{6}|#[a-f0-9]{3}|rgb *\( *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *\)|rgba *\( *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *\)|black|green|silver|gray|olive|white|yellow|maroon|navy|red|blue|purple|teal|fuchsia|aqua)$/i;

let PresenceStore;
waitFor(["isMobileOnline"], m => PresenceStore = m);
const statusOf: (id: string) => Status = id => PresenceStore.getState().clientStatuses[id];

export default definePlugin({
    name: "ShittyPlatformIndicators",
    description: "don't",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    patches: [{
        find: '="SYSTEM_TAG";',
        replacement: {
            match: /function (.{1,2})\((.{1,2})\){var/,
            replace: "function $1($2){e.decorations=Vencord.Plugins.plugins.ShittyPlatformIndicators.indicatorMessageDecoration(e.decorations);var"
        }
    }, {
        find: "lostPermissionTooltipText,",
        replacement: {
            match: /\.render=function\(\){var (.{1,2})=this,(.{1,2})=this\.props(.{0,250});return/,
            replace: ".render=function(){var $1=this,$2=this.props$3;$2.itemProps.pi_userID=$2.user?.id;return"
        }
    }, {
        find: "FocusRing was given a focusTarget",
        replacement: {
            match: /{const{within(.{1,200})children:(.{1,2})}=(.{1,2});/,
            replace: "{let{within$1children:$2}=$3;$2=Vencord.Plugins.plugins.ShittyPlatformIndicators.indicatorSidebarIcon($2);"
        }
    }],
    options: Object.fromEntries(statuses.map(s =>
        [s, {
            description: `Color of ${s} statuses`,
            type: OptionType.STRING,
            default: colors[s],
            restartNeeded: false,
        }]
    )),

    icon(color: string) {
        return {
            // "borrowed" from bd plugin
            mobile: <svg width="20" height="20" transform="scale(0.9)" viewBox="0 -2.5 28 40"><path fill={color} d="M 2.882812 0.246094 C 1.941406 0.550781 0.519531 2.007812 0.230469 2.953125 C 0.0585938 3.542969 0 7.234375 0 17.652344 L 0 31.554688 L 0.5 32.558594 C 1.117188 33.769531 2.152344 34.5625 3.519531 34.847656 C 4.210938 35 7.078125 35.058594 12.597656 35 C 20.441406 34.941406 20.691406 34.925781 21.441406 34.527344 C 22.347656 34.054688 23.078125 33.3125 23.578125 32.386719 C 23.921875 31.761719 23.941406 30.964844 24 18.085938 C 24.039062 8.503906 24 4.167969 23.847656 3.464844 C 23.558594 2.121094 22.75 1.097656 21.519531 0.492188 L 20.5 0 L 12.039062 0.0195312 C 6.402344 0.0390625 3.328125 0.113281 2.882812 0.246094 Z M 20.382812 14.582031 L 20.382812 22.917969 L 3.652344 22.917969 L 3.652344 6.25 L 20.382812 6.25 Z M 13.789062 27.539062 C 14.5 28.296875 14.597656 29.035156 14.132812 29.925781 C 13.308594 31.496094 10.671875 31.421875 9.902344 29.8125 C 9.539062 29.054688 9.539062 28.730469 9.902344 28.011719 C 10.691406 26.535156 12.632812 26.308594 13.789062 27.539062 Z M 13.789062 27.539062 "></path></svg>,
            web: <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z"></path></svg>,
            desktop: <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M4 2.5C2.897 2.5 2 3.397 2 4.5V15.5C2 16.604 2.897 17.5 4 17.5H11V19.5H7V21.5H17V19.5H13V17.5H20C21.103 17.5 22 16.604 22 15.5V4.5C22 3.397 21.103 2.5 20 2.5H4ZM20 4.5V13.5H4V4.5H20Z"></path></svg>,
            embedded: <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z"></path></svg>
        };
    },

    indicatorMessageDecoration(decorations: Decorations): Decorations {
        if (!decorations?.[1]) return decorations;
        const id = decorations[1].find(i => i.key === "new-member")?.props.message?.author?.id;
        if (!id) return decorations;

        const children: JSX.Element[] = [
            React.createElement("Fragment", { style: { padding: 2 } })
        ];
        const status = statusOf(id);
        if (!status) return decorations;
        Object.entries(status).forEach(([platform, status]) => {
            children.push(
                this.icon(Settings.plugins.ShittyPlatformIndicators[status] || colors[status])[platform]
            );
        });
        const IndicatorContainer = React.createElement("Fragment", { key: "indicator" }, children);
        decorations[1].push(IndicatorContainer);
        return decorations;
    },

    indicatorSidebarIcon(children: JSX.Element): JSX.Element {
        const isMemberListItem = children.type === "div"
            && children.props?.className?.includes("member")
            && children.props?.["data-list-item-id"]?.includes("members");
        if (!isMemberListItem) return children;
        const id = children.props.pi_userID;
        if (!id) return children;
        // react moment
        const components: JSX.Element[] = children.props?.children?.props?.children;
        if (!components) return children;
        const status = statusOf(id);
        if (!status) return children;
        components.push(
            React.createElement("Fragment", { key: "indicator" }, Object.entries(status).map(([platform, status]) =>
                this.icon(Settings.plugins.ShittyPlatformIndicators[status] || colors[status])[platform]
            ))
        );
        children.props.children.props.children = components;
        return children;
    }
});
