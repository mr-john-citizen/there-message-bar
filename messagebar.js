There.init({
	data: {
		messages: [],
		saved: [],
		cache: {
			version: '1.0.0',
			months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
			days: ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat'],
		},
	},



	/**
	 * @author There.com
	 * @description Setup gui area
	 * @returns {void}
	 */
	onReady: function () {
		There.fsCommand('setStageWidthHeight',
		{
			width: 800,
			height: 58,
		});

		There.fsCommand('setWidthHeight',
		{
			width: 0,
			height: 0,
		});

		There.fsCommand('setTextureBitDepth',
		{
			depth: 32,
		});
	},



	/**
	 * @author There.com|johnCitizen
	 * @description There.com system vars handler
	 * @param {string} name
	 * @param {mixed} value
	 * @returns {void}
	 */
	onVariable: function (name, value)
	{
		// System ready: start listening to incoming messages
		if (name == 'there_ready' && value == 1)
		{
			There.fetchPilotXml();
			There.fetchMessagesXml();
			There.fetchChatBubbleXml();
		}

		// Show/hide message bar
		if (name == 'there_msgbaropened')
		{
			if (value == 1)
			{
				There.showMessageBar();
				if (There.data.currentIndex == undefined)  There.displayMessage(0);
			}
			else
			{
				There.hideMessageBar();
			}
		}

		if (name == 'there_proxyversion') There.fetchVersionJson(value);
	},



	/**
	 * @author There.com
	 * @description Fetch version info
	 * @param {string} version
	 * @returns {void}
	 */
	fetchVersionJson: function (version)
	{
		$.ajax({
			url: 'https://www.hmph.us/there/edge/info.json',
			dataType: 'json',
			success: function (json)
			{
				if (json.version.split('.').map(e => e.padStart(3, '0')).join('') > version.split('.').map(e => e.padStart(3, '0')).join(''))
				{
					There.data.messages.push({
						id: '0',
						type: 'Info',
						priority: '1',
						text: `ThereEdge ${json.version} is now available for download.`,
						sound: '1',
						timeout: '30.0',
						buttons: [{
							id: '0',
							text: 'View',
							url: json.url,
						}, {
							id: '1',
							text: 'Later',
						}],
					});
					There.displayTopMessage();
				}
			},
		});
	},



	/**
	 * @author There.com
	 * @description Fetch message bar data
	 * @returns {void}
	 */
	fetchMessagesXml: function ()
	{
		There.data.ident = Math.random();
		let query = {
			Oid: 0,
			request: There.data.ident,
		};

		if (There.data.version != undefined) query.lastVer = There.data.version;

		There.fetch({
			path: '/VersionedXmlSvc/messageBarData',
			query: query,
			dataType: 'xml',
			success: There.onMessagesXml,
			complete: function () {
				There.setNamedTimer('fetch', 1000, There.fetchMessagesXml);
			},
		});
	},



	/**
	 * @author There.com
	 * @description Process message bar data
	 * @returns {void}
	 */
	onMessagesXml: function (xml)
	{
		const xmlAnswer = xml.getElementsByTagName('Answer')[0];
		const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];

		if (xmlResult.childNodes[0].nodeValue != 1) return;

		const xmlVersion = xmlAnswer.getElementsByTagName('version')[0];
		There.data.version = xmlVersion.childNodes[0].nodeValue;
		const xmlData = xmlAnswer.getElementsByTagName('MessageBarData')[0];
		let cancels = [];
		let autoAccepts = [];

		for (let xmlMsg of xmlData.childNodes)
		{
			switch (xmlMsg.nodeName)
			{
				case 'CancelMsg':
				{
					let xmlId = xmlMsg.getElementsByTagName('Id')[0];
					cancels.push({
						id: xmlId.childNodes[0].nodeValue,
					});
					break;
				}

				case 'AutoAcceptedMsg':
				{
					let xmlType = xmlMsg.getElementsByTagName('Type')[0];
					autoAccepts.push({
						type: xmlType.childNodes[0].nodeValue,
					});
					There.playSound('avatar message one');
					break;
				}

				case 'Msg':
				{
					let message = {
						id: xmlMsg.getElementsByTagName('Id')[0].childNodes[0].nodeValue,
						type: xmlMsg.getElementsByTagName('Type')[0].childNodes[0].nodeValue,
						priority: xmlMsg.getElementsByTagName('Priority')[0].childNodes[0].nodeValue,
						text: xmlMsg.getElementsByTagName('Text')[0].childNodes[0].nodeValue,
						sound: xmlMsg.getElementsByTagName('Sound')[0].childNodes[0].nodeValue,
						buttons: [],
					};
					let xmlResponse = xmlMsg.getElementsByTagName('Response')[0];

					if (xmlResponse != undefined)
					{
						for (let xmlResponseNode of xmlResponse.childNodes)
						{
							switch (xmlResponseNode.nodeName)
							{
								case 'Button0':
								case 'Button1':
								case 'Button2':
								{
									message.buttons.push({
										id: xmlResponseNode.nodeName.slice(-1),
										text: xmlResponseNode.childNodes[0].nodeValue,
									});
									break;
								}

								case 'Timeout':
								{
									message.timeout = xmlResponseNode.childNodes[0].nodeValue;
									break;
								}

								case 'RespNullId':
								{
									message.nullId = xmlResponseNode.childNodes[0].nodeValue;
									break;
								}
							}
						}
					}

					There.data.messages.push(message);
					break;
				}
			}
		}

		for (let autoAccept of autoAccepts)
		{
			if (['Receive', 'QuestInfo', 'Im', 'PermDeny', 'PermAllow', 'Summon', 'Info', 'Error'].includes(autoAccept.type))
			{
				There.playSound('menu item activate');
			}
		}

		for (let cancel of cancels)
		{
			const index = There.data.messages.findIndex(m => m.id == cancel.id);
			if (index >= 0)
			{
				There.data.messages.splice(index, 1);
			}
		}

		There.variables.there_msgbaropened = 0;
		There.displayTopMessage();
	},



	/**
	 * @author There.com
	 * @description Display top-most message
	 * @returns {void}
	 */
	displayTopMessage: function ()
	{
		There.limitSavedMessages();
		There.sortMessages();
		There.displayMessage(0);
	},



	/**
	 * @author There.com
	 * @description Cap saved messages
	 * @returns {void}
	 */
	limitSavedMessages: function ()
	{
		const overage = There.data.saved.length - 20;
		if (overage > 0) {
			There.data.saved.splice(-overage);
		}
	},



	/**
	 * @author There.com
	 * @description Sort message bar messages
	 * @returns {void}
	 */
	sortMessages: function ()
	{
		let messages = There.data.messages.map((e, i) => [e, i]);

		messages.sort(function (e1, e2)
		{
			if (e1[0].priority != e2[0].priority) {
				return e1[0].priority - e2[0].priority;
			}
			return e1[1] - e2[1];
		});
		There.data.messages = messages.map(e => e[0]);
	},



	/**
	 * @author There.com
	 * @description Display message bar message
	 * @param {int} index
	 * @returns {void}
	 */
	displayMessage: function (index)
	{
		There.clearNamedTimer('message');
		There.clearNamedTimer('unflash');
		There.clearNamedInterval('attention');
		There.stopSound();
		There.limitSavedMessages();
		const message = index < There.data.messages.length ? There.data.messages[index] : There.data.saved[index - There.data.messages.length];

		if (message == undefined)
		{
			delete There.data.currentIndex;
			$('.messagebar .left .icon').attr('data-id', 'Info');
			$('.messagebar .message').text('You have no messages to display.');
			$('.messagebar .message').attr('data-buttoncount', 0);
			$('.messagebar .buttons.big .button').attr('data-id', '').text('');
			$('.messagebar .buttons.arrows .button').attr('data-enabled', '0');
			$('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '1');
			return;
		}

		There.data.currentIndex = index;

		$('.messagebar .left .icon').attr('data-id', message.type);

		if (index < There.data.messages.length || message.response == undefined)
		{
			$('.messagebar .message').text(message.text);
		}
		else
		{
			$('.messagebar .message').text(message.text + message.response);
		}

		if (message.response == undefined)
		{
			$('.messagebar .message').attr('data-buttoncount', message.buttons.length);
			$('.messagebar .buttons.big .button').attr('data-id', '').text('');

			for (let button of message.buttons)
			{
				let divButton = $('.messagebar .buttons.big .button').eq(Number(button.id));
				$(divButton).attr('data-id', message.nullId > 0 ? 0 : button.id);
				$(divButton).attr('data-enabled', '1');
				$(divButton).text(button.text);
			}
		}
		else
		{
			$('.messagebar .message').attr('data-buttoncount', 0);
			$('.messagebar .buttons.big .button').attr('data-id', '').text('');
		}

		There.data.hasTimeout = false;
		var delay;

		if (index < There.data.messages.length)
		{
			if (message.timeout > 0)
			{
				There.data.hasTimeout = true;
				delay = message.timeout * 1000;
			}
			else if (message.priority == 1)
			{
				delay = 1000000;
			}
			else if
			(There.data.messages.length > 1)
			{
				delay = 2000;
			}
			else
			{
				delay = 5000;
			}
		}
		else
		{
			delay = 5000;
		}

		There.setNamedTimer('message', delay, function ()
		{
			if (There.data.messages.length > 0) There.showNextMessage();
		});

		if (index < There.data.messages.length && message.priority < 2)
		{
			$('.messagebar .buttons.arrows .button').attr('data-enabled', '0');
			$('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '0');
		}
		else
		{
			const lastIndex = There.data.messages.length + There.data.saved.length - 1;
			$('.messagebar .buttons.arrows .button[data-id="up"]').attr('data-enabled', index == 0 ? '0' : '1');
			$('.messagebar .buttons.arrows .button[data-id="down"]').attr('data-enabled', index == lastIndex ? '0' : '1');
			$('.messagebar .buttons.small .button[data-id="close"]').attr('data-enabled', '1');
		}

		if (index < There.data.messages.length && message.sound)
		{
			if (message.priority == 0)
			{
				There.playSound('avatar message one');
			}
			else
			{
				There.playSound('system message one');
			}

			if (message.priority < 2)
			{
				$('.messagebar').attr('data-flash', '0');
				There.setNamedInterval('attention', 2568, function () {
					$('.messagebar').attr('data-flash', '1');
					There.setNamedTimer('unflash', 1000, function () {
						$('.messagebar').attr('data-flash', '0');
					});

					if (message.priority == 0)
					{
						There.playSound('avatar message one');
					}
					else
					{
						There.playSound('system message one');
					}
				});
			}
		}

		if (There.data.messages.length > 0 || There.variables.there_msgbaropened == 1)
		{
			There.showMessageBar();
		}
		else
		{
			There.hideMessageBar();
		}
	},



	/**
	 * @author There.com
	 * @description Message bar button handler
	 * @returns {void}
	 */
	handleMessageButton: function (id)
	{
		const index = There.data.currentIndex;
		if (index == undefined)return;

		const message = There.data.messages[index];
		if (message == undefined) return;

		const button = message.buttons.find(e => e.id == id);
		if (button == undefined) return;

		message.response = message.buttons.length > 1 ? ` You responded "${button.text}".` : '';

		if (message.id != '0')
		{
			There.fsCommand('messageBarResponse',
			{
				id: message.id,
				button: button.id,
			});
		}
		else if (button.url != undefined)
		{
			There.fsCommand('browser', button.url);
		}

		There.log(`MessageBar: message response sent with id=${message.id} button=${button.id}`);
		There.data.hasTimeout = false;
		There.showNextMessage();
	},



	/**
	 * @author There.com
	 * @description Show previous message bar message
	 * @returns {void}
	 */
	showPreviousMessage: function ()
	{
		let index = There.data.currentIndex;
		if (index == undefined)
		{
			return;
		}

		if (index < There.data.messages.length)
		{
			There.saveMessage(index);
		}

		index--;

		if (index < 0)
		{
			index = There.data.messages.length + There.data.saved.length - 1;
		}

		There.displayMessage(index);
	},



	/**
	 * @author There.com
	 * @description Show next message bar message
	 * @returns {void}
	 */
	showNextMessage: function ()
	{
		let index = There.data.currentIndex;
		if (index == undefined) return;

		const message = There.data.messages[index];
		if (message != undefined && There.data.hasTimeout)
		{
			There.data.hasTimeout = false;
			message.response = ` Message timed out.`;

			if (message.id != '0')
			{
				There.fsCommand('messageBarResponse',
				{
					id: message.id,
					timeout: 1,
				});
			}
			There.log(`MessageBar: message timed out with id=${message.id}`);
		}

		if (index < There.data.messages.length)
		{
			There.saveMessage(index);
		}
		else
		{
			index++;
			if (index >= There.data.messages.length + There.data.saved.length) index = 0;
		}

		There.displayMessage(index);
	},



	/**
	 * @author There.com
	 * @description Save given message
	 * @returns {void}
	 */
	saveMessage: function (index)
	{
		if (index < There.data.messages.length)
		{
			There.data.saved.unshift(There.data.messages.splice(index, 1)[0]);
		}
	},



	/**
	 * @author There.com
	 * @description Show the message bar
	 * @returns {void}
	 */
	showMessageBar: function ()
	{
		if ($('.messagebar').attr('data-msgbaropened') != 1)
		{
			$('.messagebar').attr('data-msgbaropened', '1');
			There.clearNamedTimer('animator');
			There.fsCommand('setWidthHeight',
			{
				width: 800,
				height: 58,
			});
		}
	},



	/**
	 * @author There.com
	 * @description Hide the message bar
	 * @returns {void}
	 */
	hideMessageBar: function ()
	{
		if ($('.messagebar').attr('data-msgbaropened') != 0)
		{
			$('.messagebar').attr('data-msgbaropened', '0');
			There.setNamedTimer('animator', 500, function ()
			{
				There.fsCommand('setWidthHeight', {
					width: 0,
					height: 0,
				});
			});
		}
	},



	/**
	 * @author johnCitizen
	 * @description Send request with no query params
	 * @param {object} settings
	 * @emits success()|error()|complete()
	 * @returns {void}
	 */
	fetchNoQuery(settings)
	{
		$.ajax({
			'url': `http://${There.variables.there_resourceshost}${settings.path}`,
			'dataType': settings.dataType != undefined ? settings.dataType : 'xml',
			'success': settings.success,
			'error': settings.error,
			'complete': settings.complete,
		});
	},



	/**
	 * @author johnCitizen
	 * @description Fetch user info
	 * @returns {void}
	 */
	fetchPilotXml: function()
	{
		There.data.ident = Math.random();
		let query = {
			'Oid': 1,
			'request': There.data.ident,
		};

		if (There.data.version != undefined) query.lastVer = There.data.version;

		There.fetch({
			'path': '/ClientLoginGui/pilotInfo',
			'query': query,
			'dataType': 'xml',
			'success': function(xml)
			{
				const xmlAnswer = xml.getElementsByTagName('Answer')[0];
				There.data.cache.pilotId = xmlAnswer.getElementsByTagName('PilotDoid')[0].childNodes[0].nodeValue;
				There.data.cache.pilotName = xmlAnswer.getElementsByTagName('PilotName')[0].childNodes[0].nodeValue;
			},
		});
	},



	/**
	 * @author johnCitizen
	 * @description Fetch chat bubble
	 * @returns {void}
	 */
	fetchChatBubbleXml: function ()
	{
		let query = {
			'Oid': 1,
			'request': Math.random(),
		};

		if (There.data.version != undefined) query.lastVer = There.data.version;

		There.fetch({
			'path': '/VersionedXmlSvc/CommMessageData',
			'query': query,
			'dataType': 'xml',
			'success': There.onChatBubbleSuccess,
			'complete': function () {
				There.setNamedTimer('fetchChatBubbleXml', 500, There.fetchChatBubbleXml);
			},
		});
	},



	/**
	 * @author johnCitizen
	 * @description Process chat bubble
	 * @param {xml} xml
	 * @returns {void}
	 */
	onChatBubbleSuccess: function(xml)
	{
		const xmlAnswer = xml.getElementsByTagName('Answer')[0];

		const xmlResult = xmlAnswer.getElementsByTagName('Result')[0];
		if (xmlResult.childNodes[0].nodeValue != 1) return;

		let xmlData = xmlAnswer.getElementsByTagName('messageData')[0];
		xmlData = xmlData.getElementsByTagName('msg')[0];

		const author = xmlData.getElementsByTagName('authorName')[0].childNodes[0].nodeValue;
		const text = xmlData.getElementsByTagName('text')[0].childNodes[0].nodeValue;

		// Process command
		if (text.charAt(0) == '/')
		{
			const words = text.split(" ");
			There.processChatBubbleCmd(words, author.toLowerCase());
		}
		// Store link
		else if (text.toLowerCase().substring(0, 4) == 'http')
		{
			There.data.cache.link = text;
		}
		// Copy emotes
		else if (text.charAt(0) == `'` && author.toLowerCase() == There.data.cache.emotes)
		{
			There.sendChatBubble(`${text}`);
		}

		/*
		There.data.messages.push({
			id: '0',
			type: 'Info',
			priority: 0,
			text: str,
			sound: '0',
			timeout: '2',
			buttons: [],
		});
		There.displayTopMessage();
		*/
	},



	/**
	 * @author johnCitizen
	 * @description Process chat command
	 * @param {string[]} words Array of command arguments
	 * @param {string} author Author of command
	 * @returns {void}
	 */
	processChatBubbleCmd: async function(words, author)
	{
		const date = new Date();
		const cmd = words.shift().toLowerCase();

		switch (cmd)
		{
			case '/ping':
				if (words.length > 0 && words[0].toLowerCase() == There.data.cache.pilotName.toLowerCase()) There.sendChatBubble(`Pong! v${There.data.cache.version}`);
				break;


			case '/ver':
			case '/version':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendChatBubble(`Citizen v${There.data.cache.version}`);
				break;


			case '/puppet':
			case '/slave':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 1) There.data.cache.puppet = words[0].toLowerCase();
				if (words.length == 0) There.data.cache.puppet = null;
				break;


			case '/url':
				if (author == There.data.cache.pilotName.toLowerCase() && ('link' in There.data.cache)) There.fsCommand('browser', There.data.cache.link);
				break;


			case '/time':
			case '/t':
				if (author != There.data.cache.pilotName.toLowerCase()) break;

				const h = date.getHours() > 12 ? date.getHours() - 12 : (date.getHours() == 0 ? '12' : date.getHours());
				const m = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
				const a = date.getHours() > 11 ? 'PM' : 'AM';

				There.sendChatBubble(`${h}:${m} ${a}  ${-date.getTimezoneOffset() / 60}`);
				break;


			case '/date':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				const d = There.data.cache.days[date.getDay()];

				There.sendChatBubble(`${d}, ${date.getDate()} ${There.data.cache.months[date.getMonth()]} ${date.getFullYear()}`);
				break;


			case '/help':
			case '/?':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'https://github.com/mr-john-citizen/there-message-bar');
				break;


			case '/ff':
			case '/f':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('forcefield', {'toggle': 1});
				break;


			case '/com':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('communicator');
				break;


			case '/cc':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('togglepreference', {'pref': 'CruiseControl'});
				break;


			case '/mute':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('setpreference', {'pref': 'MuteAllSound', 'value': 0});
				break;


			case '/unmute':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('setpreference', {'pref': 'MuteAllSound', 'value': 1});
				break;


			case '/hf':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('voiceTalk', {'toggle': 1});
				break;


			case '/voice':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('togglepreference', {'pref': 'VoiceToggle'});
				break;


			case '/undo':
			case '/goback':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Places/Undo Last Teleport/activate');
				break;


			case '/im':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.sendHookCommand('/mainMenu/People/IM/activate');
				if (words.length == 1) There.avieLookup(words[0]).then((doid) => There.sendGuiCommand('im', {'av': doid}));
				break;


			case '/summon':
			case '/sm':
			case '/get':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.sendHookCommand('/mainMenu/People/Summon/activate');
				if (words.length == 1) There.avieLookup(words[0]).then((doid) => There.sendGuiCommand('summon', {'av': doid}));
				break;


			case '/ignore':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/People/Ignore/Ignore Someone/activate');
				break;


			case '/organize':
			case '/o':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/My Things/Organize.../activate');
				break;


			case '/add':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Places/Add Favorite.../activate');
				break;


			case '/actionbar':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/People/Action Bar/activate');
				break;


			case '/worldchat':
			case '/wc':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/People/Show World Chat/activate');
				break;

			case '/local':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'http://127.0.0.1:9999');
				break;


			case '/flag':
			case '/activity':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Activities/List Activity/activate');
				break;


			case '/weather':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Weather On/activate');
				break;


			case '/music':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Music Playing/activate');
				break;


			case '/0':
			case '/standard':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Standard View/activate');
				break;

			case '/1':
			case '/low':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Aerial View/Low Zoom/activate');
				break;


			case '/2':
			case '/medium':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Aerial View/Medium Zoom/activate');
				break;


			case '/3':
			case '/high':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Aerial View/High Zoom/activate');
				break;


			case '/4':
			case '/super':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Aerial View/Super Zoom/activate');
				break;


			case '/5':
			case '/world':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Aerial View/World Zoom/activate');
				break;


			case '/body':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Body Mirror/activate');
				break;


			case '/face':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Views/Face Mirror/activate');
				break;


			case '/lr':
			case '/l':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/This Place/Leave Race/activate');
				break;


			case '/join':
			case '/race':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/This Place/Join Race/activate');
				break;


			case '/results':
			case '/rr':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/This Place/Race Results/activate');
				break;


			case '/record':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/This Place/Course/Record/activate');
				break;


			case '/arcade':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/This Place/Arcade Mode/Start/activate');
				break;


			case '/vt':
			case '/voicetrainer':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'https://webapps.prod.there.com/VoiceTrainer/Trainer.html');
				break;


			case '/th':
			case '/thist':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'https://webapps.prod.there.com/commercehistory/commercehistory');
				break;


			case '/events':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'https://webapps.prod.there.com/eventmgmt/myevents?show=attend');
				break;


			case '/hn':
				if (author == There.data.cache.pilotName.toLowerCase()) There.fsCommand('browser', 'https://webapps.prod.there.com/eventmgmt/eventmgmt?op=search2&HappeningNow=1&minPop=1');
				break;


			case '/tbux':
			case '/tb':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/Shop/Buy More Therebucks/activate');
				break;


			case '/avsearch':
			case '/avatar':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', 'https://webapps.prod.there.com/profiles/people-search.xml');
				if (words.length == 1) There.fsCommand('browser', `https://webapps.prod.there.com/listings/listings?Type=12&Filter=12&PageSize=20&Stylesheet=/profiles/people-search-results.xsl&t_AvatarName_1=S&o_AvatarName_1=LIKE&v_AvatarName_1=${words[0]}`);
				break;


			case '/goto':
			case '/tp':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', 'https://webapps.prod.there.com/places/places?count=100');
				if (words.length == 1 && words[0].substring(0, 1) == '#') There.avieLookup(words[0].substring(1, words[0].length)).then((doid) => There.fsCommand('browser', `https://webapps.prod.there.com/goto/goto?obj=${doid}`));
				if (words.length >= 1 && words[0].substring(0, 1) != '#') There.fsCommand('browser', `https://webapps.prod.there.com/goto/goto?placename=${words.join('+')}`);
				break;


			case '/pf':
			case '/profile':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', 'https://webapps.prod.there.com/profiles/profiles?op=edit');
				if (words.length == 1) There.fsCommand('browser', `https://webapps.prod.there.com/profiles/profiles?op=view&AvatarName=${words[0]}`);
				break;


			case '/seller':
			case '/sales':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', `https://webapps.prod.there.com/items/sellersearch?SortDescDate=EndTime&PageSize=50&Page=1&SellerName=${There.data.cache.pilotName}`);
				if (words.length >= 1) There.fsCommand('browser', `https://webapps.prod.there.com/items/sellersearch?SortDescDate=EndTime&PageSize=50&Page=1&SellerName=${words.join('+')}`);
				break;

			case '/designer':
			case '/designs':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', `https://webapps.prod.there.com/items/designersearch?Page=1&PageSize=50&SortDescDate=EndTime&ArtKitDesignerName=${There.data.cache.pilotName}`);
				if (words.length >= 1)There.fsCommand('browser', `https://webapps.prod.there.com/items/designersearch?Page=1&PageSize=50&SortDescDate=EndTime&ArtKitDesignerName=${words.join('+')}`);
				break;


			case '/bids':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length >= 1) There.fsCommand('browser', `https://webapps.prod.there.com/items/bidhistory?ItemId=${words.join('+')}`);
				break;


			case '/auctions':
			case '/auction':
			case '/ac':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', `https://webapps.prod.there.com/items/home`);
				if (words.length >= 1) There.fsCommand('browser', `https://webapps.prod.there.com/items/view?ItemId=${words.join('+')}`);
				break;


			case '/map':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('map');
				break;


			case '/comp':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendGuiCommand('compass');
				break;


			case '/ctof':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendChatBubble(`${words[0]}c = ${Math.floor(words[0] * 1.8 + 32)}f`);
				break;


			case '/ftoc':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendChatBubble(`${words[0]}f = ${Math.floor((words[0] - 32) * 0.5555555555555556)}c`);
				break;


			case '/google':
			case '/g':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', `https://google.com`);
				if (words.length >= 1) There.fsCommand('browser', `https://google.com/search?hl=en&ie=UTF-8&q=${words.join('+')}`);
				break;


			case '/youtube':
			case '/yt':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.fsCommand('browser', `https://youtube.com`);
				if (words.length >= 1) There.fsCommand('browser', `https://youtube.com/results?search_query=${words.join('+')}`);
				break;


			case '/emotes':
				if (author != There.data.cache.pilotName.toLowerCase()) break;
				if (words.length == 0) There.data.cache.emotes = null;
				if (words.length == 1) There.data.cache.emotes = words[0].toLowerCase();
				break;


			case '/exit':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Exit/activate');
				break;


			case '/logout':
			case '/bye':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Logout/activate');
				break;


			case '/settings':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Settings/activate');
				break;


			case '/vol':
			case '/volume':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Volume/activate');
				break;


			case '/aj':
			case '/chatgroup':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Auto-Join Chat Groups/activate');
				break;


			case '/tags':
			case '/names':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Nametags/Show all visible/activate');
				break;


			case '/notags':
			case '/nonames':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/There/Customize/World/Nametags/Show none/activate');
				break;


			case '/labels':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('showObjectLabels', 1);
				break;


			case '/nolabels':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('showObjectLabels', 0);
				break;


			case '/speech':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('hideSpeech', 0);
				break;


			case '/nospeech':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('hideSpeech', 1);
				break;


			case '/fps':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('flipHud', 1);
				break;


			case '/nofps':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('flipHud', 0);
				break;


			case '/show':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('noRenderHud', 0);
				break;


			case '/hide':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('noRenderHud', 1);
				break;


			case '/zoneson':
			case '/zon':
			case '/z':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('showOtherZones', 1);
				break;

			case '/zonesoff':
			case '/zoff':
			case '/zo':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('showOtherZones', 0);
				break;


			case '/colview':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('colView', 1);
				break;


			case '/nocolview':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendVariableCmd('colView', 0);
				break;


			case '/cm':
			case '/changeme':
			case '/wear':
				if (author == There.data.cache.pilotName.toLowerCase()) There.sendHookCommand('/mainMenu/My Things/ChangeMe/activate');
				break;



		}
	},



	/**
	 * @author johnCitizen
	 * @description Sends bubble message
	 * @param {string} msg The message to send
	 * @returns {void}
	 */
	sendChatBubble: function(msg)
	{
		There.fetchNoQuery({
			'path': `/ScriptHook/Invoke?Path=/acc/addChatText&Args=text%3D${msg.substring(0,80)}%0A`,
		});
	},



	/**
	 * @author johnCitizen
	 * @description Send GUI command
	 * @param {string} command
	 * @param {object|null} args
	 * @returns {void}
	 */
	sendGuiCommand: function(command, args)
	{
		args = args || null;
		let query = {
			'action': command,
			'GuiCommandArgs': (args != null) ? new URLSearchParams(args).toString() : ' ',
		};

		There.fetch({
			'path': '/GuiService/simulateGuiCommand',
			'query': query,
		});
	},



	/**
	 * @author johnCitizen
	 * @description Send hook command
	 * @param {string} command
	 * @returns {void}
	 */
	sendHookCommand: function (hook)
	{
		let query = {'Path': hook};

		There.fetch({
			'path': '/ScriptHook/Invoke',
			'query': query,
		});
	},



	/**
	 * @author johnCitizen
	 * @description Avie name lookup
	 * @param {string} name
	 * @returns {Promise<string>} Doid
	 */
	avieLookup: async function(name)
	{
		let query = {
			'avatarname': name,
			'homedoid': There.data.cache.pilotId,
		};

		return await new Promise((resolve, reject) =>
		{
			There.fetch({
				'path': '/AvPro/nametodoid',
				'query': query,
				'success': (xml) =>
				{
					const xmlAnswer = xml.getElementsByTagName('Answer')[0];
					resolve(xmlAnswer.getElementsByTagName('AvatarDoid')[0].childNodes[0].nodeValue);
				},
				'error': reject,
			});
		});
	},



	/**
	 * @author johnCitizen
	 * @description Set variable
	 * @param {string} key
	 * @param {any} value
	 * @returns {void}
	 */
	sendVariableCmd: function(key, value)
	{
		let query = {
			'variable': key,
			'value': value,
			'modify': '',
		};

		There.fetch({
			'path': '/environment/top',
			'query': query,
		});
	}
});



/**
 * @author There.com
 * @description Message bar gui event handlers
 * @returns {void}
 */
$(document).ready(function ()
{
	$('.messagebar .button').on('mouseover', function (event)
	{
		There.playSound('control rollover');
	})
	.on('mousedown', function (event)
	{
		There.playSound('control down');
		event.stopPropagation();
	})
	.on('mouseup', function (event)
	{
		There.playSound('control up');
	});


	$('.messagebar .button[data-id="help"]').on('click', function ()
	{
		There.fsCommand('browser', {
			target: 'There_Help',
			urlGen: 'HelpMessageBarUrl',
		});
	});


	$('.messagebar .button[data-id="close"]').on('click', function ()
	{
		if ($(this).attr('data-enabled') != 1) return;
		There.hideMessageBar();
	});


	$('.messagebar .buttons.big .button').on('click', function ()
	{
		if ($(this).attr('data-enabled') != 1) return;
		There.handleMessageButton($(this).attr('data-id'));
	});


	$('.messagebar .buttons.arrows .button[data-id="up"]').on('click', function ()
	{
		if ($(this).attr('data-enabled') != 1) return;
		There.showPreviousMessage();
	});


	$('.messagebar .buttons.arrows .button[data-id="down"]').on('click', function ()
	{
		if ($(this).attr('data-enabled') != 1) return;
		There.showNextMessage();
	});
})
