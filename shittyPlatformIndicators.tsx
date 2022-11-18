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
type StatusType = typeof statuses[number];

const platforms = ["desktop", "mobile", "web", "embedded"] as const;
type PlatformType = typeof platforms[number];

interface Status {
    desktop?: StatusType;
    mobile?: StatusType;
    web?: StatusType;
    embedded?: StatusType;
}
let PresenceStore;
waitFor(["isMobileOnline"], m => PresenceStore = m);
const statusOf: (id: string) => Status = id => PresenceStore.getState().clientStatuses[id];

const colors: { [k in StatusType]: string } = {
    online: "#3ba55d",
    idle: "#faa81a",
    dnd: "#ed4245",
    offline: "#747f8d"
};

interface Decorations {
    0: any,
    1: JSX.Element[];
}

function IndicatorSVG(props: { variant: PlatformType, color: string; }): JSX.Element {
    const { variant, color } = props;
    switch (variant) {
        // no need for `break`s since we are instantly returning :trollface:
        case "mobile":
            return <svg width="20" height="20" transform="scale(0.9)" viewBox="0 -2.5 24 40"><path fill={color} d="M 2.882812 0.246094 C 1.941406 0.550781 0.519531 2.007812 0.230469 2.953125 C 0.0585938 3.542969 0 7.234375 0 17.652344 L 0 31.554688 L 0.5 32.558594 C 1.117188 33.769531 2.152344 34.5625 3.519531 34.847656 C 4.210938 35 7.078125 35.058594 12.597656 35 C 20.441406 34.941406 20.691406 34.925781 21.441406 34.527344 C 22.347656 34.054688 23.078125 33.3125 23.578125 32.386719 C 23.921875 31.761719 23.941406 30.964844 24 18.085938 C 24.039062 8.503906 24 4.167969 23.847656 3.464844 C 23.558594 2.121094 22.75 1.097656 21.519531 0.492188 L 20.5 0 L 12.039062 0.0195312 C 6.402344 0.0390625 3.328125 0.113281 2.882812 0.246094 Z M 20.382812 14.582031 L 20.382812 22.917969 L 3.652344 22.917969 L 3.652344 6.25 L 20.382812 6.25 Z M 13.789062 27.539062 C 14.5 28.296875 14.597656 29.035156 14.132812 29.925781 C 13.308594 31.496094 10.671875 31.421875 9.902344 29.8125 C 9.539062 29.054688 9.539062 28.730469 9.902344 28.011719 C 10.691406 26.535156 12.632812 26.308594 13.789062 27.539062 Z M 13.789062 27.539062 "></path></svg>;
        case "desktop":
            return <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M4 2.5C2.897 2.5 2 3.397 2 4.5V15.5C2 16.604 2.897 17.5 4 17.5H11V19.5H7V21.5H17V19.5H13V17.5H20C21.103 17.5 22 16.604 22 15.5V4.5C22 3.397 21.103 2.5 20 2.5H4ZM20 4.5V13.5H4V4.5H20Z"></path></svg>;
        case "web":
            return <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z"></path></svg>;
        case "embedded":
            return <svg width="20" height="20" viewBox="0 -2.5 24 24"><path fill={color} d="M5.79335761,5 L18.2066424,5 C19.7805584,5 21.0868816,6.21634264 21.1990185,7.78625885 L21.8575059,17.0050826 C21.9307825,18.0309548 21.1585512,18.9219909 20.132679,18.9952675 C20.088523,18.9984215 20.0442685,19 20,19 C18.8245863,19 17.8000084,18.2000338 17.5149287,17.059715 L17,15 L7,15 L6.48507125,17.059715 C6.19999155,18.2000338 5.1754137,19 4,19 C2.97151413,19 2.13776159,18.1662475 2.13776159,17.1377616 C2.13776159,17.0934931 2.1393401,17.0492386 2.1424941,17.0050826 L2.80098151,7.78625885 C2.91311838,6.21634264 4.21944161,5 5.79335761,5 Z M14.5,10 C15.3284271,10 16,9.32842712 16,8.5 C16,7.67157288 15.3284271,7 14.5,7 C13.6715729,7 13,7.67157288 13,8.5 C13,9.32842712 13.6715729,10 14.5,10 Z M18.5,13 C19.3284271,13 20,12.3284271 20,11.5 C20,10.6715729 19.3284271,10 18.5,10 C17.6715729,10 17,10.6715729 17,11.5 C17,12.3284271 17.6715729,13 18.5,13 Z M6,9 L4,9 L4,11 L6,11 L6,13 L8,13 L8,11 L10,11 L10,9 L8,9 L8,7 L6,7 L6,9 Z"></path></svg>;
    }
}

function Indicator(props: { status: Status; }): JSX.Element {
    const { status } = props;
    const statuses = Object.entries(status);
    // not padded for mobile as the svg itself leaves a gap
    return <span key="indicators" style={{ paddingLeft: statuses[0][0] === "mobile" ? 0 : 4 }}>
        {statuses.map(([platform, status]) =>
            <IndicatorSVG variant={platform as PlatformType} color={Settings.plugins.ShittyPlatformIndicators[status] || colors[status]} />
        )}
    </span>;
}

// leaving this here in case there's ever a way to check input before save
// ty stackoverflow
// const colorRegex = /^(#[a-f0-9]{6}|#[a-f0-9]{3}|rgb *\( *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *\)|rgba *\( *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *, *[0-9]{1,3}%? *\)|black|green|silver|gray|olive|white|yellow|maroon|navy|red|blue|purple|teal|fuchsia|aqua)$/i;

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
            replace: "function $1($2){$2.decorations=Vencord.Plugins.plugins.ShittyPlatformIndicators.indicatorMessageDecoration($2.decorations);var"
        }
    },
    {
        find: "lostPermissionTooltipText,",
        replacement: {
            match: /Fragment,{children:\[(.{0,80})\]/,
            replace: "Fragment,{children:[Vencord.Plugins.plugins.ShittyPlatformIndicators.indicatorSidebarDecoration(this.props),$1]"
        }
    }],
    options: {
        hideForBots: {
            description: "Hide the platform indicator for bots",
            type: OptionType.BOOLEAN,
            restartNeeded: false
        },
        ...Object.fromEntries(statuses.map(s =>
            [s, {
                description: `Color of ${s} statuses`,
                type: OptionType.STRING,
                default: colors[s],
                restartNeeded: false,
            }]
        ))
    },

    indicatorMessageDecoration(decorations: Decorations): Decorations {
        if (!decorations?.[1]) return decorations;
        const user = decorations[1].find(i => i.key === "new-member")?.props.message?.author;
        if (user?.bot && Settings.plugins[this.name].hideForBots) return decorations;
        const id = user?.id;
        if (!id) return decorations;

        const status = statusOf(id);
        if (!status || !Object.values(status).length) return decorations;
        decorations[1].push(<Indicator status={status} />);
        return decorations;
    },

    indicatorSidebarDecoration(props: any): JSX.Element | null {
        const { user } = props;
        if (user?.bot && Settings.plugins[this.name].hideForBots) return null;
        const id = user?.id;
        if (!id) return null;
        const status = statusOf(id);
        if (!status) return null;

        return <Indicator status={status} />;
    }
});
