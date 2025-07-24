# There.com Message Bar mod
There.com Message Bar mod adds the functionality of the "bedican compass" commands into the message bar using Javascript instead of Adobe Flash (RIP). All you need is a text editor to make your own changes!

## Install

1. Download the [latest release](https://github.com/mr-john-citizen/there-message-bar/releases).
2. Copy `backup.js`, `messagebar.js` into `C:\Makena\There\ThereClient\Resources\messagebar\`.

## Uninstall

1. Delete `C:\Makena\There\ThereClient\Resources\messagebar\messagebar.js`.
2. Rename `C:\Makena\There\ThereClient\Resources\messagebar\backup.js` to `C:\Makena\There\ThereClient\Resources\messagebar\messagebar.js`.

## Commands

| Command | Description |
| --- | --- |
| /ping {{username}} | Test message-bar mod is working for given username |
| /ver<br>/version | View current version installed |
| /url | Open any url from chat |
| /time<br>/t | View current local time |
| /date | View current local date |
| /help | View this page |
| /ff<br>/f | Toggle Force Field |
| /com | Open Communicator window |
| /cc | Toggle Cruise Control |
| /mute | Mute sounds |
| /unmute | Unmute sounds |
| /hf | Toggle hands free mode |
| /voice | Toggle voice mode |
| /undo<br>/goback | Undo teleport |
| /im<br>/im {{username}} | Open IM chat |
| /summon<br>/summon {{username}}<br>/sm<br>/sm {{username}}<br>/get<br>/get {{username}} | Summon user |
| /ignore | Open Ignore window |
| /organize<br>/o | Open Organize window |
| /add | Open Add to favorites window |
| /actionbar | Open Action-bar |
| /worldchat<br>/wc | Open World Chat window |
| /flag<br>/activity | Open Activity window |
| /weather | Toggle weather |
| /music | Toggle music |
| /0<br>/standard | Set camera to Standard |
| /1<br>/low | Set camera to low zoom  |
| /2<br>/medium | Set camera to medium zoom |
| /3<br>/high | Set camera to high zoom |
| /4<br>/super | Set camera to super zoom |
| /5<br>/world | Set camera to world zoom |
| /body | Set camera to body mirror |
| /face | Set camera to face mirror |
| /lr<br>/l | Leave race |
| /join<br>/race | Join race |
| /results<br>/rr | View race results |
| /vt<br> | Open Voice Trainer |
| /th<br> | View Transaction History |
| /events<br>/hn | View events |
| /tbux<br>/tb | Purchase T-bucks |
| /avsearch<br>/avatar {{username}} | Search for username  |
| /goto {{location}}<br>/tp {{location}} | Teleport to location |
| /pf<br>/pf {{username}}<br>/profile<br>/profile {{username}} | View your profile/View username's profile |
| /seller {{username}}<br>/sales {{username}} | View seller's items |
| /designer {{username}}<br>/designs {{username}} | View designer's items|
| /bids | Opens bids page |
| /auction<br>/ac<br>/auctions | Opens Auctions page |
| /map | Opens map |
| /comp | Opens Compass |
| /ctof {{degrees}} | Converts celsius to fahrenheit |
| /ftoc {{degrees}} | Converts fahrenheit to celsius |
| /google {{topic}}<br>/g {{topic}} | Search google for topic |
| /youtube {{topic}}<br>/yt {{topic}}  | Search youtube for topic |
| /emotes<br>/emotes {{username}} | Parrot username's emote actions |
| /exit | Exit There |
| /logout<br>bye | Log out |
| settings | Show settings window |
| vol<br>volume<br>aj | Show volume window |
| chatgroup | Enable auto-join chat group |
| tags<br>names | Show name tags |
| notags<br>nonames | Hide name tags |
| labels | Show object labels |
| nolabels | Hide object labels |
| speech | Show speech bubble |
| nospeech | Hide speech bubble |
| fps | Show FPS |
| nofps | Hide FPS |
| show | Show HUD |
| hide | Hide HUD |
| zoneson<br>zon<br>z | Show zone boundries |
| zonesoff<br>zoff<br>zo | Hide zone boundries |
| colview | Show collisions |
| nocolview | Hide collisions |
| cm<br>changeme<br>wear | Show Change Me window |


## Code docs / Making your own changes:

### Function `onChatBubbleSuccess(xml)`

Processes chat bubble data:

- Determines if text is a command `/...`, or
- Determines if text is a link `http...`, or
- Determines if text is an emote `'...`


### Function `processChatBubbleCmd(words, author)`

Determines the command and carries out an action.

This is where you'd add/remove commands!


### Function `sendChatBubble(msg)`

Sends given text as chat bubble.


### Function `sendGuiCommand(command, args)`

Sends GUI command, eg: open various windows.


### Function `sendHookCommand(hook)`

Sends hook command, typically a menu-item request.


### Function `avieLookup(name)`

Fetches user ID from given name.


### Function `sendVariableCmd`

Sets game variable, eg: toggle zone boundries.


### Function `fetchChatBubbleXml()`

Fetches chat bubble data, every 250ms.


### Other functions

All the other functions are for the orginial message bar behaviour. Modify at your own peril!