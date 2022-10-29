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

import definePlugin from "../utils/types";

export default definePlugin({
    name: "Dashless",
    description: "Removes dashes from channel names",
    authors: [{
        name: "ActuallyTheSun",
        id: 406028027768733696n
    }],
    patches: [
        {
            // channel mentions
            find: 'case"voice-locked":',
            replacement: {
                match: /var (.{1,2})=(.{1,2})\.children,(.{1,2})=.{1,2}\.className/,
                replace: "var $1=typeof $2.children?.[0]==='string'?[$2.children[0].replace(/-/g,' '),...e.children.slice(1)]:$2.children,\
                $3=$2.className"
            }
        },
        {
            // sidebar channel list
            find: "().overflow),ref",
            replacement: {
                match: /var (.{1,2})=(.{1,2}).children,(.{0,120});return (.{1,2})\.createElement\(/,
                replace: "var $1=$2.children,$3;\
                if(typeof $1[0].props?.children==='string')$1[0].props.children=$1[0].props.children.replace(/-/g,' ');\
                return $4.createElement("
            }
        },
        {
            // channel name at the top
            find: '?"header-secondary":void 0',
            replacement: {
                match: /,(.{1,2})=(.{1,2})\.children,(.{1,2})=.{1,2}\.onContextMenu(.{0,300});return null!=/,
                replace: ",$1=typeof $2.children==='string'?$2.children.replace(/-/g,' '):$2.children,\
                $3=$2.onContextMenu$4;\
                if(typeof $1.props?.children?.[2]==='string')$1.props.children[2]=$1.props.children[2].replace(/-/g,' ');\
                return null!="
            }
        },
        {
            // channel mention autocomplete
            find: "AutocompleteRow: renderContent",
            replacement: {
                match: /;(.{1,2})\.render=function\(\){var (.{1,2})=this,(.{0,100});return /,
                replace: ";$1.render=function(){var $2=this,$3;\
                if($2.props.channel?.name)$2.props.channel.name=$2.props.channel.name.replace(/-/g,' ');\
                return "
            }
        },
        {
            // message box placeholder
            find: "handleOpenExpressionPicker=function",
            replacement: {
                match: /;(.{1,2})\.render=function\(\){var (.{1,2})=this,(.{1,2})=this\.props,(.{0,120}),(.{1,2})=.{1,2}\.placeholder/,
                replace: ";$1.render=function(){var $2=this,$3=this.props,$4,$5=$3.placeholder?.replace(/-/g,' ')"
            }
        }
    ],
});
