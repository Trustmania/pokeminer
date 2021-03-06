
/*
	Created by Devsome
	thanks to imDevinC https://github.com/ImDevinC/pkgo-discord for the functions
	edited for https://github.com/modrzew/pokeminer
*/
//from names import POKEMON_NAMES

const Discord = require("discord.js");
var request = require("request");
var NodeGeocoder = require('node-geocoder');
var fs = require("fs");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

// Loading my Configs
var config = require("./bot/config.json");
//var config = require("./bot/config.json")
var locale = require("./locales/pokemon."+config.locale+".json");

const clientBot = new Discord.Client();

var alreadySeen = [];
var joinUrl = "https://discordapp.com/oauth2/authorize?client_id=" + config.app_id + "&scope=bot&permissions=";
var mapUrl = 'http://maps.google.com/maps?&z=10&ll={0}+{1}&q={0}+{1}';
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: config.gmap_key, 
  formatter: null
};
var geocoder = NodeGeocoder(options);

clientBot.on("ready", function () {
	console.log("\n[INFO]\tTo add me visit this url:\n\t" + joinUrl + "\n\n");
	console.log("[INFO]\tReady to begin!");
	const channel = clientBot.channels.find('id', config.sightingsChannelID);
//       	const channel = clientBot.channels.find('id', config.generalChannelID);
	if (channel) {
//          channel.sendMessage("testing...");
	//          channel.sendMessage("`prune all 100");
        } else {
          console.log('Error: Bot not allowed in channel');
        }
});

clientBot.on('disconnected', function() {
	console.log("Disconnted ? Let me reconnect asap...");
	clientBot.loginWithToken(config.token);
});

clientBot.on("error", function (error) {
	console.log("Caught error: " + error);
});

// CMD+C at terminal
process.on("SIGINT", function () {
	console.log("\n Whoa wait, let me logout first...");
	clientBot.destroy().then(function(){
        	process.exit();                        
	});
});

function checkPokemon() {
	request('http://' + config.getServer + '/discord', (err, res, body) => {
		if (err) {
			console.log(err);
			return;
		}
		if (200 != res.statusCode) {
			console.log('Invalid response code: ' + res.statusCode);
			return;
		}
		parsePokemon(JSON.parse(body));
	});
}

function triggerIFTTT()
{

    for (key in config.maker_keys)
    {
    	var theUrl = "https://maker.ifttt.com/trigger/ultra_rare_pokemon/with/key/" + key;
    	var xmlHttp = new XMLHttpRequest();
    	xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    	xmlHttp.send(null);
    }
}

function parsePokemon(results) {
	var config = require("./bot/config.json");
	if (!Object.keys(results) || Object.keys(results).length < 1) {
		return;
	}
	foundPokemon = [];
	for (pokemon in results) {
		if(config.pokeShow.indexOf(results[pokemon].pokemon_id) >= 0 ) {
			// found
		} else {
			continue; // not found
		}
		foundPokemon.push(results[pokemon].key);
		if (alreadySeen.indexOf(results[pokemon].key) > -1) {
			continue;
		}

		newPokemonSighted(results[pokemon]);
		alreadySeen.push(results[pokemon].key);
	}

	clearStalePokemon(foundPokemon);
}

function clearStalePokemon(pokemons) {
	var oldSeen = alreadySeen;
	for (id in oldSeen) {
		var pokemon = pokemons.indexOf(oldSeen[id]);
		if (pokemon > -1) {
			continue;
	}

	var index = alreadySeen.indexOf(oldSeen[id]);
		alreadySeen.splice(index, 1);
	}
}

function newPokemonSighted(pokemon) {
	var diff = new Date(pokemon.disappear_time * 1000) - Date.now();
	console.log("Disappear time:" + pokemon.disappear_time);
	diff = Math.floor(diff / 1000);
	diff = Math.floor(diff / 60);
	min_diff = diff % 60;
	var url = mapUrl.split('{0}').join(pokemon.lat);
	url = url.split('{1}').join(pokemon.lng);


	var currentTime = new Date();
	var expiresAtTime = new Date(0);
	expiresAtTime.setTime(pokemon.disappear_time*1000);
	var cEnding = "AM";
	var cHours = currentTime.getHours() + 1;
	var cMin = (currentTime.getMinutes()<10?'0':'') + currentTime.getMinutes();
	var cSec = (currentTime.getSeconds()<10?'0':'') + currentTime.getSeconds();
	if (cHours >= 12)
	{
		cEnding = "PM";
		if (cHours > 12)
		{
			cHours = cHours - 12;
		}
	}
	if (cHours == 0)
	{
		cHours = "12";
	}
	
	var eEnding = "AM";
	var eHours = expiresAtTime.getHours()+1;
	var eMin = (expiresAtTime.getMinutes()<10?'0':'') + expiresAtTime.getMinutes();
	var eSec = (expiresAtTime.getSeconds()<10?'0':'') + expiresAtTime.getSeconds();
	if (eHours >= 12)
	{
		eEnding = "PM";
		if (eHours > 12)
		{
			eHours = eHours - 12;
		}
	}
	if (eHours == 0)
	{
		eHours = "12";
	}
	var currentTimeStr = cHours+":"+cMin+":"+cSec + " " + cEnding;
	
	var expiresAtTimeString = eHours+":"+eMin+":"+eSec + " " + eEnding;
	console.log("expires");
	console.log(pokemon.disappear_time);
	var locationString = "http://maps.google.com/maps?z=12&t=m&q=loc:" + pokemon.lat + "+" + pokemon.lng;
	var message = currentTimeStr + " : " + pokemon.name + ' (' + pokemon.pokemon_id + ') found! Disappears in ' + min_diff + ' minutes at '+ expiresAtTimeString +'. \n'+ locationString  +'';

	const channel = clientBot.channels.find('id', config.sightingsChannelID);

	channel.sendFile( __dirname + "/bot/img/"+ pokemon.pokemon_id +".png" , pokemon.pokemon_id +".png", message, (err, msg) => {
	if (err) {
		channel.sendMessage("I do not have the rights to send a **file** :cry:!");
	}
	});

	if(config.pokeShowRare.indexOf(pokemon.pokemon_id) >= 0 ) {
                        // found
        	triggerIFTTT();
	} 
}

function isMod(msg)
{
	var userRoles =  msg.member.roles;
	if (userRoles.exists("name", "Mod"))
	{
		return true;
       	}
       	else
       	{
       	        msg.channel.sendMessage("Permission denied");
	}
	return false;
}

clientBot.on("message", function (msg) {
	
	if(msg.author.id != clientBot.user.id && msg.content[0] == '!' && msg.channel.type === 'text')
        {

		var messageContentAll = msg.content.toUpperCase().split(" ");
		var messageContent = messageContentAll[0];
		var userRoles =  msg.member.roles;

		if(messageContent == "!ECHO")
		{
			msg.channel.sendMessage("I hear you!");
		}
		else if (messageContent === "!HELP")
		{
			var commands = [];
			commands.push("General Use:");
			commands.push("!HELP");
			commands.push("!ECHO");
			commands.push("!LIST");
			commands.push("!LISTRARE");
			commands.push("");
			commands.push("Mods Only:");
			commands.push("!ADD 16/pidgey");
			commands.push("!ADDRARE 16/pidgey");
			commands.push("!REMOVE 16/pidgey");
			commands.push("!REMOVERARE 16/pidgey");
			commands.push("!POKEDEX 16/pidgey");
			commands.push("!CLEARCHAT 98");
			msg.channel.sendMessage(commands);
		}
		else if (messageContent === "!POKEDEX")
		{
			if (messageContentAll.length > 1)
                        {
				var pokemonName = "";
				for (var i = 1; i < messageContentAll.length; i++)
				{
					pokemonName += messageContentAll[i];
					if (i < messageContentAll.length - 1)
					{
						pokemonName += " ";	
					}
				}
			
				var pokemonInfo = getPokemonInfoFromName(pokemonName);
				if (pokemonInfoValid(pokemonInfo))
				{
					msg.channel.sendMessage(pokemonInfo[0] + ": " + pokemonInfo[1]);	
				}
				else
				{
					msg.channel.sendMessage("No match found");
				}
			}
			else
			{
				msg.channel.sendMessage("No parameter detected");
			}
		}
		else if (messageContent === "!LIST")
		{
			var config = require( __dirname + '/bot/config.json' );
			var result = [];
			result.push("All pokemon being notified for:");
			for (var i = 0; i < config.pokeShow.length; i++)
			{
				var pokemonInfo = getPokemonInfoFromNumber(config.pokeShow[i]);
                                if (pokemonInfoValid(pokemonInfo))
                                {
					result.push(pokemonInfo[0].toString() + ": " + pokemonInfo[1]);		
				}
                                else
                                {
					console.log("error listing");	
                                }
			}
			msg.channel.sendMessage(result);
		}
		else if (messageContent === "!LISTRARE")
                {
			var config = require( __dirname + '/bot/config.json' );
                        var result = [];
			result.push("All rare pokemon being notified for:");
			for (var i = 0; i < config.pokeShowRare.length; i++)
                        {
				var pokemonInfo = getPokemonInfoFromNumber(config.pokeShowRare[i]);
                                if (pokemonInfoValid(pokemonInfo))
                                {
                                        result.push(pokemonInfo[0].toString() + ": " + pokemonInfo[1]);
                                }
                                else
                                {
                                        console.log("error listing");
                                }
                        }
			msg.channel.sendMessage(result);
                }
		else if (messageContent === "!ADD")
                {
			if (isMod(msg))
                        {
				if (messageContentAll.length > 1)
				{
					var config = require( __dirname + '/bot/config.json' );
	                                var array = config.pokeShow;
						
					var pokemonInfo = getPokemonInfoFromNumber(messageContentAll[1]);
                                	if (pokemonInfoValid(pokemonInfo))
                                	{
						var newItem = parseInt(pokemonInfo[0]);
						var pokemonString = pokemonInfo[0] + ": " + pokemonInfo[1];

	                                	if (array.indexOf(newItem) == -1) {
	                                	        array.push(newItem);   
							msg.channel.sendMessage("Added to notify list: " + pokemonString);
							array = sortPokemonArray(array);
		                                	fs.writeFileSync( __dirname + '/bot/config.json' , JSON.stringify(config));
	                                	} else {
							msg.channel.sendMessage("Already present in notify list: " + pokemonString);
	                                	}
					}
					else
					{
						msg.channel.sendMessage("Error adding");	
					}
                                	delete require.cache[ __dirname + '/bot/config.json' ]
				}
				else {
					msg.channel.sendMessage("No parameter detected");
				}
			}
                }
		else if (messageContent === "!ADDRARE")
                {
                        if (isMod(msg))
                        {
                                if (messageContentAll.length > 1)
                                {

					var config = require( __dirname + '/bot/config.json' );
                                        var array = config.pokeShow;

                                        var pokemonInfo = getPokemonInfoFromNumber(messageContentAll[1]);
                                        if (pokemonInfoValid(pokemonInfo))
                                        {
                                                var newItem = parseInt(pokemonInfo[0]);
                                                var pokemonString = pokemonInfo[0] + ": " + pokemonInfo[1];

                                                if (array.indexOf(newItem) == -1) {
                                                        array.push(newItem);
                                                        msg.channel.sendMessage("Added to notify list: " + pokemonString);
                                                        array = sortPokemonArray(array);
                                                        fs.writeFileSync( __dirname + '/bot/config.json' , JSON.stringify(config));
                                                } else {
                                                        msg.channel.sendMessage("Already present in notify list: " + pokemonString);
                                                }
						
						array = config.pokeShowRare;
                                        	if (array.indexOf(newItem) == -1) {
                                        	        array.push(newItem);
                                        	        msg.channel.sendMessage("Added to rare notify list: " + pokemonString);
                                        	        array = sortPokemonArray(array);
                                        	        fs.writeFileSync( __dirname + '/bot/config.json' , JSON.stringify(config));
                                        	} else {
                                                	msg.channel.sendMessage("Already present in rare notify list: " + pokemonString);
                                        	}
                                        }
                                        else
                                        {
                                                msg.channel.sendMessage("Error adding");
                                        }
                                        delete require.cache[ __dirname + '/bot/config.json' ]
                                }
                                else {
                                        msg.channel.sendMessage("No parameter detected");
                                }
                        }
                }
		else if (messageContent === "!REMOVE")
		{
			if (isMod(msg))
                        {
                                if (messageContentAll.length > 1)
                                {
					var pokemonInfo = getPokemonInfoFromNumber(messageContentAll[1]);
                                        if (pokemonInfoValid(pokemonInfo))
                                        {
                                                var config = require( __dirname + '/bot/config.json' );
                                                var newItem = parseInt(pokemonInfo[0]);
                                                var pokemonString = pokemonInfo[0] + ": " + pokemonInfo[1];
                                                var array = config.pokeShow;
                                                var i = array.indexOf(newItem);
                                                if (i == -1) {
                                                        msg.channel.sendMessage("Unable to remove, was not present: " + pokemonString);
                                                } else {
                                                        array.splice(i, 1);
                                                        msg.channel.sendMessage("Removed from notify list: " + pokemonString);
                                                }

                                                array = config.pokeShowRare;
                                                var j = array.indexOf(newItem);
                                                if (j == -1) {
                                                        //msg.channel.sendMessage("Unable to remove, was not present: " + pokemonString);
                                                } else {
                                                        array.splice(j, 1);
                                                        msg.channel.sendMessage("Removed from rare notify list: " + pokemonString);
                                                }
						if (i != -1 || j != -1)
                                                        fs.writeFileSync( __dirname + '/bot/config.json' , JSON.stringify(config));

						delete require.cache[ __dirname + '/bot/config.json' ]
                                        } else {
                                                msg.channel.sendMessage("Error removing from notify list");
                                        }				
				}
				else {
                                        msg.channel.sendMessage("No parameter detected");
                                }
			}
		}
		else if (messageContent === "!REMOVERARE")
                {
                        if (isMod(msg))
                        {
                                if (messageContentAll.length > 1)
                                {
					var pokemonInfo = getPokemonInfoFromNumber(messageContentAll[1]);
                                        if (pokemonInfoValid(pokemonInfo))
                                        {
                                        	var config = require( __dirname + '/bot/config.json' );
                                        	var newItem = parseInt(pokemonInfo[0]);
                                        	var pokemonString = pokemonInfo[0] + ": " + pokemonInfo[1];
                                        	var array = config.pokeShowRare;
                                        	var i = array.indexOf(newItem);
                                        	if (i == -1) {
                                        	        msg.channel.sendMessage("Unable to remove, was not present: " + pokemonString);
                                        	} else {
                                        	        array.splice(i, 1);
                                        	        msg.channel.sendMessage("Removed from rare notify list: " + pokemonString);
                                        	        msg.channel.sendMessage("Still exists in notify list: " + pokemonString);
                                        	        fs.writeFileSync( __dirname + '/bot/config.json' , JSON.stringify(config));
                                        	}
                                       		delete require.cache[ __dirname + '/bot/config.json' ]
                                	} else {
						msg.channel.sendMessage("Error removing from notify list");
					}
				}
				else {
                                        msg.channel.sendMessage("No parameter detected");
                                }
                        }
                }
		else if (messageContent === "!CLEARCHAT")
		{
			if (isMod(msg))
			{
				if (messageContentAll.length > 1)
                                {
					var numberToDelete = parseInt(messageContentAll[1]) + 2;
					if (!isNaN(numberToDelete))
					{
						var wasLargerThanOneHundred = false;
						if (numberToDelete > 100)
						{
							wasLargerThanOneHundred = true;
							numberToDelete = 100;
						}
						msg.channel.sendMessage("Clearing chat");
						msg.channel.fetchMessages({limit: numberToDelete})
						.then(function(messages)
						{
							msg.channel.bulkDelete(messages);			
						})
						.catch(function(error) {
							msg.channel.sendMessage("Error clearing chat");  
						});
						if (wasLargerThanOneHundred)
						{
							msg.channel.sendMessage("Can't clear more than 98 messages at a time!");
						}
					}
					else
					{
						msg.channel.sendMessage("Not a valid number");
					}
				}
				else {
                                        msg.channel.sendMessage("No parameter detected");
                                }
			}
		}
		else
                {
                	msg.channel.sendMessage("Invalid Command");
                }
	}
});


function pokemonInfoValid(pokemonInfo)
{
	var valid = true;
	if (pokemonInfo[0] == -1 && pokemonInfo[1] === "")
	{
		valid = false;
	}
	return valid;
}

function getPokemonInfoFromName(pokemonName, specialNum)
{
        var number = -1;
	var name = "";
        for (var i = 0; i < locale.length; i++)
        {
                var tempPokemonName = locale[i].ename.toUpperCase();
                if (tempPokemonName === pokemonName)
                {
			number = locale[i].id;
                      	name = locale[i].ename;
			break;
                }
        }
	var pokemonInfo = [number, name];
        if (!pokemonInfoValid(pokemonInfo) && typeof specialNum === 'undefined')
        {
                pokemonInfo = getPokemonInfoFromNumber(pokemonName, 1);
        }
        return pokemonInfo;
}

function getPokemonInfoFromNumber(pokedexNumber, specialNum)
{
	var name = "";
	var number = -1;
        for (var i = 0; i < locale.length; i++)
        {
                var tempPokedexNumber = locale[i].id;
                if (tempPokedexNumber == pokedexNumber)
                {
			name = locale[i].ename;
			number = locale[i].id;
       			break;
		}
       	}
	var pokemonInfo = [number, name];
	if (!pokemonInfoValid(pokemonInfo) && typeof specialNum === 'undefined')
	{
		pokemonInfo = getPokemonInfoFromName(pokedexNumber, 1);
	}
	return pokemonInfo;
}

function sortPokemonArray(pokemonArray)
{
	pokemonArray.sort(function(a, b){
        	var pokedexNum1 = parseInt(a);
                var pokedexNum2 = parseInt(b);

                if (pokedexNum1 < pokedexNum2) //sort string ascending
                	return -1;
                if (pokedexNum1 > pokedexNum2)
                        return 1;
                return 0; //default return value (no sorting)
        });
	return pokemonArray;
}

clientBot.login(config.token);

/* checking for new pokemon */
setInterval(() => {
	checkPokemon();
}, (config.CheckMinutes * 1000) * 10); //checking for Pokemon every x minutes

