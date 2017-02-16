'use strict';

var http = require('http');
var https = require('https');
var AWS = require('aws-sdk');
//var dynamodb = null;
//var Alexa = require('alexa-sdk');
var AlexaSkill = require('./AlexaSkill');
var langfile=require('./languagefile');
var optionfile=require('./options');

var options=optionfile.options;
var STATE_RESPONSES=langfile.STATE_RESPONSES;
var GLOBAL_TRANSLATE=langfile.GLOBAL_TRANSLATE;
var REPLACE_TEXT=langfile.REPLACE_TEXT;

var EchoFibaro = function () {
    AlexaSkill.call(this, options.appid);
};

GLOBAL_TRANSLATE = {
    "blockiere licht aus" : "BlockGlobalLightOff",
    "nachtzeit" : "NightTime",
    "meldung sonos bad" : "SonosMsgBad",
    "meldung sonos küche" : "SonosMsgKitchen",
    "sonos text to speech" : "SonosTTS",
    "sonos text to speech bad" : "SonosTTSBad",
    "telegramm" : "Telegram",
    "alarm status" : "AlarmState",
    "anwesendheitsstatus" : "PresentState"
};

EchoFibaro.prototype = Object.create(AlexaSkill.prototype);
EchoFibaro.prototype.constructor = EchoFibaro;

var re=new RegExp(Object.keys(REPLACE_TEXT).join("|"),"g"); 


function matchRuleShort(str, rule) {
  return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

Array.prototype.getIdOfDeviceWithName = function(obj) {
    return this.filter(function(item) {
        for (var prop in obj)
        {
            // prop is the key; item[prop] is the value of the target array-list working on; obj[prop] is the filter array given as parameter
            //console.log("Remove Me: prop="+prop+", obj[prop]="+obj[prop]+", item[prop]="+item[prop]);
            if (!(prop in item) || obj[prop].toLowerCase() !== item[prop].toLowerCase())
                 return false;
        }
        return true;
    });
};

String.prototype.replaceArray = function(find, replace) {
  var replaceString = this;
  for (var i = 0; i < find.length; i++) {
    replaceString = replaceString.replace(find[i], replace);
  }
  return replaceString;
};

String.prototype.replaceArrayArray = function() {
    var replaceString = this;
    replaceString = replaceString.replace(re, function(matched){
        return REPLACE_TEXT[matched];
    });
    return replaceString;
};


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function replaceAllBackwards(str){
    for(var key in REPLACE_TEXT){
        str = str.replaceAll(REPLACE_TEXT[key], key);
    }
    return str;
}


function sendCommandToDevices(data,response,additionalNameFilters,additionalRoomFilters,command,responseText)
{
    var jsonContent = JSON.parse(data);
    
    /*if (additionalNameFilters!==undefined)
        jsonContent = jsonContent.getIdOfDeviceWithName(additionalNameFilters);*/
    
    console.log("sendCommandToDevices (Name-Filter: "+additionalNameFilters+", Room-Filter: "+additionalRoomFilters+")");
    
    if (jsonContent===undefined||jsonContent.length===0)
        return false;

    var ids=[];
    for(var i = 0; i < jsonContent.length; i++)
    {
        var foundr=true;
        var foundn=true;
        if (additionalNameFilters!==undefined&&additionalNameFilters.length>0)
        {
            foundn=false;
            for(var j = 0; j < additionalNameFilters.length; j++)
            {
                //console.log('Comparing "'+jsonContent[i].name+'" to "*'+additionalNameFilters[j]+'*"');
                if (additionalNameFilters[j].toLowerCase()==STATE_RESPONSES.All.toLowerCase() || matchRuleShort(jsonContent[i].name,'*'+additionalNameFilters[j]+'*'))
                {
                    foundn=true;
                    break; // breaking additionalNameFilters loop, continue with next device
                }
            }
        }
        if (additionalRoomFilters!==undefined&&additionalRoomFilters.length>0)
        {
            foundr=false;
            for(var k = 0; k < additionalRoomFilters.length; k++)
            {
                if (jsonContent[i].roomID==additionalRoomFilters[k])
                {
                    foundr=true;
                    break;
                }
            }
        }
        
        if (foundn&&foundr)
        {
            //console.log('Adding: '+jsonContent[i].id);
            ids.push(jsonContent[i].id);
        }
    }

    if (ids.length<1)
        return false;
    //console.log('Length: '+ids.length);

    //var responses = [];
    var completed_requests = 0;
    for (var m=0;m<ids.length;m++)
    {
        console.log("Got "+ids[m]);
        options.path = '/api/callAction?deviceID='+ids[m]+'&'+command;
        httpreq(options, function(error) {
            //responses.push(error);
            completed_requests++;
            if (completed_requests == ids.length) {
                logAndSay(response,responseText);
            }
        });
    }
    return true;
}

function logAndSay(response,msg)
{
    console.log(msg);
    if (options.reAsk)
        response.ask(msg, STATE_RESPONSES.DoSomething);
    else
        response.tell(msg);
}

function logAndSayQuit(response,msg)
{
    console.log(msg);
    response.tell(msg);
}

function translateSpokenToGlobalVariable(txt)
{
    if (GLOBAL_TRANSLATE[txt.toLowerCase()]!==undefined)
        return GLOBAL_TRANSLATE[txt.toLowerCase()];
    if (GLOBAL_TRANSLATE[txt]!==undefined)
        return GLOBAL_TRANSLATE[txt];
    return undefined;
}

function getRoomIDForName(response,roomname, eventCallback)
{
    roomname=roomname.toLowerCase();
    console.log("Trying to find ID for room "+roomname);
    getJsonRoomFromFibaro(response,function (events) {
        //console.log(events);
        var jsonContent = JSON.parse(events);
        console.log("Parsing data to find room");
        if (jsonContent.length===0)
        {
            eventCallback(-1);
            return -1;
        }
        for(var i = 0; i < jsonContent.length; i++)
	        if (jsonContent[i].name.toLowerCase()==roomname)
	        {
	            eventCallback(jsonContent[i].id);
	            return jsonContent[i].id;
	        }
        eventCallback(-2);
    });
    //return -2;
}


function checkDevice(response,session,events,name,room)
{
    console.log('Parameter: '+events);
    var jsonContent = JSON.parse(events);
    if (jsonContent.length===0)
    {
        logAndSay(response,STATE_RESPONSES.NoDeviceFound);
        return;
    }
    
    jsonContent = jsonContent.getIdOfDeviceWithName({"name":name});
    if (jsonContent===undefined||jsonContent.length===0||jsonContent.length>1)
    {
        console.log(jsonContent);
        logAndSay(response,STATE_RESPONSES.NoDeviceFound);
        return;
    }
    console.log('So far');
    // Save id for yes/no answer
    session.attributes.lastSwitch=jsonContent[0].id;
    session.attributes.lastSwitchCommand='turnOn';
    
    var onoff=jsonContent[0].properties.value;
    var result='';
    if (onoff=='true')
    {
        session.attributes.lastSwitchCommand='turnOff';
        if (jsonContent[0].type=='com.fibaro.FGWP101')
        {
            var power=parseFloat(jsonContent[0].properties.power).toFixed(1).toString().replace(".", ",");
            result=STATE_RESPONSES.SwitchOnPower.replace('$Device',name).replace('$value',power);
        }
        else if (jsonContent[0].type=='com.fibaro.doorLock')
        {
            session.attributes.lastSwitchCommand='turnOn';
            result=STATE_RESPONSES.DoorClosed.replace('$Device',name);
            response.ask(result+STATE_RESPONSES.AskOpenDoor.replace('$Device',name));
            return;
        }
        else
        {
            result=STATE_RESPONSES.SwitchOn.replace('$Device',name);
        }
        response.ask(result+STATE_RESPONSES.SwitchAskOff.replace('$Device',name));
    }
    else
    {
        if (jsonContent[0].type=='com.fibaro.doorLock')
        {
            session.attributes.lastSwitchCommand='turnOff';
            result=STATE_RESPONSES.DoorOpen.replace('$Device',name);
            response.ask(result+STATE_RESPONSES.AskCloseDoor.replace('$Device',name));
        }
        else
        {
            result=STATE_RESPONSES.SwitchIsOff.replace('$Device',name);
            response.ask(result+STATE_RESPONSES.SwitchAskOn.replace('$Device',name));
        }
    }
    console.log('Result: '+result);
    
}


function rgbWork(response,data,lightName,getColor,getProgram,cmdValue,textValue)
{
    var jsonContent=JSON.parse(data);
    var ids = jsonContent.getIdOfDeviceWithName({"name":lightName});
    var id=ids[0].id;
    if (ids===undefined||ids.length===0||ids.length>1)
    {
        logAndSay(response,STATE_RESPONSES.NoDeviceFound);
        return;
    }

    if (getColor)
    {
        var rgbw=ids[0].properties.color.split(",");
        logAndSay(response,STATE_RESPONSES.RGBLight.replace('$red',rgbw[0]).replace('$green',rgbw[1]).replace('$blue',rgbw[2]).replace('$white',rgbw[3]));
        return;
    }
    
    if (getProgram)
    {
        var program=parseInt(ids[0].properties.currentProgram);
        if (program===0)
            logAndSay(response,STATE_RESPONSES.NoRGBProgramRunning);
        else
            logAndSay(response,STATE_RESPONSES.RGBProgramRunning.replace('value',program));
        return;
    }
    
    options.path = '/api/callAction?deviceID='+id+'&'+cmdValue;
    httpreq(options, function(error) {
        logAndSay(response,textValue);
        if (error!==undefined)
            logAndSayQuit(response,STATE_RESPONSES.ErrorInAPI);
    });
    
}

EchoFibaro.prototype.intentHandlers = {
    "AMAZON.StopIntent": function (intent, session, response) {
        logAndSayQuit(response,STATE_RESPONSES.Bye, STATE_RESPONSES.Bye);
    },
    "HelpIntent": function (intent, session, response) {
        response.ask(STATE_RESPONSES.NoHelpYet, STATE_RESPONSES.DoSomething);
    },
    
    StopIntent: function (intent, session, response) {
        logAndSayQuit(response,STATE_RESPONSES.Bye, STATE_RESPONSES.Bye);
    },

    SceneIntent: function (intent, session, response) {
        console.log("SceneIntent received");
    	//console.log(intent.slots);
    	console.log(intent.slots.Name); // both is right, it depends on something...
    	//console.log(intent.slots.Preset.Name);
    	var sceneName=intent.slots.Name.value;
	    var control='start';
	    if (sceneName===undefined||sceneName=='?'||sceneName==='')
	    {
	        logAndSay(response,STATE_RESPONSES.SceneNotFound);
	        return;
	    }
	    getJsonSceneFromFibaro(response,function (events) {
    	       var jsonContent = JSON.parse(events);
    	        var ids = jsonContent.getIdOfDeviceWithName({"name":sceneName});
    	        if (ids[0]===undefined)
    	        {
    	            logAndSay(response,STATE_RESPONSES.SceneNotFound);
    	            return;
    	        }
                options.path = '/api/sceneControl?action='+control+'&id='+ids[0].id;
                httpreq(options, function(error) 
                {
                    console.log(error);
                    logAndSay(response,STATE_RESPONSES.SceneStarted.replace('$Szenename',sceneName));
                });
    	});
    },
    
    SceneOutputIntent: function (intent, session, response) {
        console.log("SceneOutputIntent received");
    	//console.log(intent.slots);
    	console.log(intent.slots.Name); // both is right, it depends on something...
    	//console.log(intent.slots.Preset.Name);
    	var sceneName=intent.slots.Name.value;
	if (sceneName===undefined||sceneName=='?'||sceneName==='')
	{
	    logAndSay(response,STATE_RESPONSES.SceneNotFound);
	    return;
	}
    	getJsonSceneFromFibaro(response,function (events) {
    	    var jsonContent = JSON.parse(events);
    	    var ids = jsonContent.getIdOfDeviceWithName({"name":sceneName});
    	    if (ids[0]===undefined)
    	    {
    	        logAndSay(response,STATE_RESPONSES.SceneNotFound);
    	        return;
    	    }
    	    var sceneID=parseInt(ids[0].id);
    	    getJsonDataFromScene(response,ids[0].id, function(data) {
                if (data===undefined)
                {
                    logAndSay(response,STATE_RESPONSES.NoSceneOutput.replace('$Name',sceneName));
                    return;
                }
                var jsonOutput = JSON.parse(data);
                var out='';
                // There is: timestampt, type (debug) and txt
                for(var i = 0; i < jsonOutput.length; i++)
    	            if (jsonOutput[i].type=="DEBUG")    // TODO: changeme later
    	                out+=jsonOutput[i].txt+' ';
    	        if (out==='')
		    logAndSay(response,STATE_RESPONSES.NoSceneOutput.replace('$Name',sceneName));
    	        else
                    logAndSay(response,STATE_RESPONSES.SceneOutput.replace('$Output',out));
    	    });
    	});
    },
    
    TemperatureIntent: function (intent, session, response)
    {
        console.log("TemperatureIntent received");
    	console.log(intent.slots);
    	var roomValue=intent.slots.Room.value;
    	var typ=intent.slots.Type.value; //warm, feucht, hell
    	console.log("Room: "+roomValue); // both is right, it depends on something...
    	console.log("Typ: "+typ);
    	getRoomIDForName(response,roomValue, function(roomID)
    	{
        	// TODO: defaultThermostat!
        	if (roomID<0)
        	{
        	    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomValue));
        	    return;
        	}
        	//console.log(intent.slots.Preset.Name);
        	var type='temperatureSensor';
        	var valueSpoken=STATE_RESPONSES.Temperature;
        	var einheit=STATE_RESPONSES.Degrees;
        	if (typ===undefined)
        	{
        	    logAndSay(response,STATE_RESPONSES.InvalidValue);
    	            return;
        	}
        	typ=typ.toLowerCase();
        	if (STATE_RESPONSES.Warm.toLowerCase().indexOf(typ)!==-1)
        	{
        	    type='temperatureSensor';
        	    valueSpoken=STATE_RESPONSES.Temperature;
        	    einheit=STATE_RESPONSES.Degrees;
        	    console.log("Temperature");
        	}
        	else if (STATE_RESPONSES.Humid.toLowerCase().indexOf(typ)!==-1)
        	{
        	    type='humiditySensor';
        	    valueSpoken=STATE_RESPONSES.Humidity;
        	    einheit=STATE_RESPONSES.Percent;
        	    console.log("Feuchtigkeit");
        	}
        	else if (STATE_RESPONSES.Bright.toLowerCase().indexOf(typ)!==-1)
        	{
        	    type='lightSensor';
        	    valueSpoken=STATE_RESPONSES.Luminance;
        	    einheit=STATE_RESPONSES.Lux;
        	    console.log("Helligkeit");
        	}
        	else
        	{
        	    console.log("No fitting type found");
        	    logAndSay(response,STATE_RESPONSES.InvalidValue);
    	        return;
        	}
            getJsonDataFromFibaro(response,'type=com.fibaro.'+type+'&enabled=true&visible=true&roomID='+roomID,function (events) {
    	        //console.log('Parameter: '+events);
    	        var jsonContent = JSON.parse(events);
    	        if (jsonContent.length===0)
    	        {
    	            logAndSay(response,STATE_RESPONSES.NoSensorFound.replace('$Room',roomValue));
    	            return;
    	        }
    	        var min=99, max=0, diff=0;
    	        for(var i=0; i<jsonContent.length; i++)
    	        {
    	            var t=parseInt(jsonContent[i].properties.value);
    	            console.log('Found one: '+t);
    	            if (t<min)
    	                min=t;
    	            if (t>max)
    	                max=t;
    	            diff+=t;
    	        }
    	        var result='';
    	        diff/=jsonContent.length;
    	        diff=diff.toFixed(0).replace('.',',');
    	        //min=min.toFixed(1).replace('.',',');
    	        //max=max.toFixed(1).replace('.',',');
    	        if (jsonContent.length==1)
    	            result=STATE_RESPONSES.SensorState.replace('$Room',roomValue).replace(/\$Unit/g,einheit).replace('$SensorTyp',valueSpoken).replace('$value',diff);
    	        else
    	            result=STATE_RESPONSES.SensorStateMinMax.replace('$Room',roomValue).replace(/\$Unit/g,einheit).replace('$SensorTyp',valueSpoken).replace('$value1',min).replace('$value2',max).replace('$value3',diff);
    	       
    	        if (type=='temperatureSensor')
    	        {
        	        getJsonDataFromFibaro(response,'type=com.fibaro.thermostatDanfoss&enabled=true&visible=true&roomID='+roomID,function (events2) {
            	            var jsonContent = JSON.parse(events2);
            	            if (jsonContent[0]!==undefined)
            	            {
            	                console.log('Found one: '+jsonContent[0].name);
            	                var current=jsonContent[0].properties.value;
            	                result+=STATE_RESPONSES.ThermostatCurrent.replace('$value',current);
            	            }
            	            logAndSay(response,result);
        	        });
        	    }
		else
		    logAndSay(response,result);
            });
    	});
    },
    
    AlarmIntent: function (intent, session, response)
    {
        console.log("AlarmIntent received");
        
        getJsonDataFromFibaro(response,'property=[armed,true]&enabled=true&visible=true',function (events) {
	        var jsonContent = JSON.parse(events);
	        if (jsonContent===undefined)
	        {
	            logAndSay(response,STATE_RESPONSES.ErrorInAPI);
	            return;
	        }
	        if (jsonContent.length===0)
	        {
                    logAndSay(response,STATE_RESPONSES.AlarmInactive);
	            return;
	        }
	        
	        var armed=[];
	        for (var i=0;i<jsonContent.length;i++)
	        {
	            console.log("Found armed device: "+jsonContent[i].id);
	            armed.push(jsonContent[i].name.replaceArrayArray());
	        }
	        
            logAndSay(response,STATE_RESPONSES.AlarmActive+" "+STATE_RESPONSES.ArmedModules+" "+armed.join(","));
            return;
        });
    },

    GlobalIntent: function (intent, session, response)
    {
        console.log("GlobalIntent received");
        if (intent.slots.Variable.value===undefined)
        {
            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
            return;
        }
    	var globalValue=translateSpokenToGlobalVariable(intent.slots.Variable.value);
    	console.log(globalValue);
        if (globalValue===undefined)
        {
            logAndSay(response,STATE_RESPONSES.NoGlobalVariableFound.replace('$value',intent.slots.Variable.value));
            return;
        }
    	/*if (deviceValue.toLowerCase()=='waschmaschine')
    	    return;*/
    	// or baseType: com.fibaro.binarySwitch
        getJsonGlobalFromFibaro(response,globalValue,function (events) {
	        console.log('Parameter: '+events);
	        var jsonContent = JSON.parse(events);
	        //console.log('JSON: '+jsonContent);
	        if (jsonContent===undefined)
	        {
	            logAndSay(response,STATE_RESPONSES.NoGlobalVariableFound.replace('$value',globalValue));
	            return;
	        }

            /*
            {
              "name": "AlarmState",
              "value": "Armed",
              "isEnum": true,
              "enumValues": [
                "Arm",
                "Armed",
                "Arming",
                "Disarm",
                "Disarmed",
                "HalfArmed"
              ],
            */
	        // Save id for yes/no answer
	        var v=jsonContent.value;
	        session.attributes.lastGlobal=globalValue;
	        session.attributes.lastGlobalValue=v;
	        var possibleResults;
	        if (jsonContent.isEnum)
	        {
	            possibleResults=STATE_RESPONSES.PossibleGlobalValues+' '+jsonContent.enumValues.toString();
	        }
	        
	        var result=STATE_RESPONSES.GlobalValue.replace('$global',globalValue).replace('$value',v);
    	        console.log('Result: '+result);
                response.ask(result+possibleResults,STATE_RESPONSES.ChangeGlobalValue);
        });
    },
    
    GlobalSetIntent: function (intent, session, response)
    {
        console.log("GlobalSetIntent received");
        if (intent.slots.Variable.value===undefined)
        {
            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
            return;
        }
    	var globalValue=translateSpokenToGlobalVariable(intent.slots.Variable.value);
        if (globalValue===undefined)
        {
            logAndSay(response,STATE_RESPONSES.NoGlobalVariableFound.replace('$value',intent.slots.Variable.value));
            return;
        }
    	var newvalue=intent.slots.Value.value;
    	if (newvalue===undefined)
    	{
    	    logAndSay(response,STATE_RESPONSES.ParameterMissing);
    	    return;
    	}
    	console.log(globalValue);
    	console.log(newvalue);
        getJsonGlobalFromFibaro(response,globalValue,function (events) {
	        //console.log('Parameter: '+events);
	        var jsonContent = JSON.parse(events);
	        if (jsonContent===undefined)
	        {
	            logAndSay(response,STATE_RESPONSES.NoGlobalVariableFound.replace('$value',globalValue));
	            return;
	        }
	        // Save id for yes/no answer
	        var v=jsonContent.value;
	        session.attributes.lastGlobal=globalValue;
	        session.attributes.lastGlobalValue=v;
	        var possibleResults;
	        if (jsonContent.isEnum)
	        {
	            possibleResults=STATE_RESPONSES.PossibleGlobalValues+' '+jsonContent.enumValues.toString();
	            if (jsonContent.enumValues.indexOf(newvalue)<0)
	            {
	                logAndSay(response,STATE_RESPONSES.IllegalValueForGlobalVariable.replace('$global',globalValue).replace('$newvalue',newvalue));
	                return;
	            }
	        }
	        
	        if (v.toLowerCase()==newvalue.toLowerCase())
	        {
                    logAndSay(response,STATE_RESPONSES.ValuesAreIdentical);
                    return;
	        }

            options.path = '/api/globalVariables/'+globalValue;
            httpreq(options, function(error) {
                logAndSay(response,STATE_RESPONSES.GlobalVariableSet.replace('$global',globalValue).replace('$newvalue',newvalue).replace('$oldvalue',v));
            }, JSON.stringify({"value":newvalue,"invokeScenes":true}));
        });
    },
    
    VirtualIntent: function (intent, session, response)
    {
        console.log("VirtualIntent received");
    	var modul=intent.slots.Module.value;
    	var button=intent.slots.Button.value;
    	var wert=intent.slots.Value.value;
    	var room=intent.slots.Room.value;
    	console.log(modul);
    	console.log(button);
    	// TODO: add room
    	/*
    	"type":"virtual_device"
    	"roomID": 2
    	"properties.ui.lblDebug.value": "Play",
    	{
          "type": "button",
          "elements": [
            {
              "id": 7,
              "lua": true,
              "waitForResponse": false,
              "caption": "› Play",
              "name": "btnPlay",
              "empty": false,
              "msg": "-- PLAY\nlocal _f = fibaro\nlocal sid, bid = _f:getSelfId(), 28\nlocal cmd, log = \"PLAY\", \"Play command was sent\"\nlocal _x ={root=\"x_sonos_object\",load=function(b)local c=_f:getGlobalValue(b.root)if string.len(c)>0 then local d=json.decode(c)if d and type(d)==\"table\"then return d else _f:debug(\"Unable to process data, check variable\")end else _f:debug(\"No data found!\")end end,set=function(b,e,d)local f=b:load()if f[e]then for g,h in pairs(d)do f[e][g]=h end else f[e]=d end;_f:setGlobal(b.root,json.encode(f))end,get=function(b,e)local f=b:load()if f and type(f)==\"table\"then for g,h in pairs(f)do if tostring(g)==tostring(e or\"\")then return h end end end;return nil end}\n_x:set(tostring(sid), { action = tostring(cmd ..\" \")})\n_f:log(log);\n_f:call(sid, \"setProperty\", \"ui.lblDebug.value\", log);\n_f:call(sid, \"pressButton\", bid);",
              "buttonIcon": 0,
              "favourite": false,
              "main": true
            },
            
            api/callAction?deviceID=X&name=pressButton&arg1=
    	*/
        getJsonDataFromFibaro(response,'type=virtual_device&enabled=true&visible=true',function (events) {
	        //console.log('Parameter: '+events);
	        var jsonContent = JSON.parse(events);
	        jsonContent = jsonContent.getIdOfDeviceWithName({"name":modul});
	        if (jsonContent===undefined||jsonContent.length!==1)
	        {
	            logAndSay(response,STATE_RESPONSES.VirtualModuleNotFound.replace('$name',modul));
	            return;
	        }
	        var modulID=jsonContent[0].id;
	        var bid;
	        var bcmp=button.toLowerCase();
	        //console.log(jsonContent[0].properties.rows);
	        for (var k=0;k<jsonContent[0].properties.rows.length;k++)
	        {
	            if (wert===undefined&&jsonContent[0].properties.rows[k].type!=="button")
	                continue;
	            if (wert!==undefined&&jsonContent[0].properties.rows[k].type!=="slider")
	                continue;
	            for (var l=0;l<jsonContent[0].properties.rows[k].elements.length;l++)
	            {
	                //console.log("Comparing '"+jsonContent[0].properties.rows[k].elements[l].caption.toLowerCase()+"' to '"+bcmp+"'");
    	            if (jsonContent[0].properties.rows[k].elements[l].caption.toLowerCase().indexOf(bcmp)!==-1)
    	            {
    	                bid=jsonContent[0].properties.rows[k].elements[l].id;
    	                break;
    	            }
	            }
	        }
	        
	        if (bid===undefined)
	        {
	            if (wert===undefined)
	                logAndSay(response,STATE_RESPONSES.ButtonNotFound.replace('$name',button));
	            else
	                logAndSay(response,STATE_RESPONSES.SliderNotFound.replace('$name',button));
	            return;
	        }
	        
	        // Get button-id:
	        /*"type": "button",
        "elements": [
          {
            "id": 7,
            "lua": true,
            "waitForResponse": false,
            "caption": "› Play",*/
	        
	        // Save id for additional button
	        session.attributes.lastModuleID=modulID;
	        session.attributes.lastModuleButton=bid;
	        session.attributes.lastModuleValue=wert;
            
            if (wert!==undefined)
            {
                options.path = '/api/callAction?deviceID='+modulID+'&name=setSlider&arg1='+bid+'&arg2='+parseInt(wert);
                console.log('Path: '+options.path);
                httpreq(options, function(error) {
                    logAndSay(response,STATE_RESPONSES.SetSlider.replace('$name',modul).replace('$slider',button).replace('$value',wert));
                });
            }
            else
            {
                options.path = '/api/callAction?deviceID='+modulID+'&name=pressButton&arg1='+bid;
                console.log('Path: '+options.path);
                httpreq(options, function(error) {
                    logAndSay(response,STATE_RESPONSES.PressedButton.replace('$name',modul).replace('$button',button));
                });
            }
        });
    },
    
    StatusIntent: function (intent, session, response)
    {
        console.log("StatusIntent received");
    	var deviceValue=intent.slots.Device.value;
    	var room=intent.slots.Room.value;
    	console.log(deviceValue);
    	/*if (deviceValue.toLowerCase()=='waschmaschine')
    	    return;*/
    	// or baseType: com.fibaro.binarySwitch ... com.fibaro.doorLock (type)
    	// TODO Greenwave Switch: Somebody screwed baseType and type...
        if (room!==undefined)
        {
            getRoomIDForName(response,room,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',intent.slots.Room.value));
                    return;
                }
                
            	if (deviceValue.toLowerCase().indexOf(STATE_RESPONSES.DoorLock)===-1)
                    getJsonDataFromFibaro(response,'type=com.fibaro.doorLock&enabled=true&visible=true&roomID='+roomID,function (events) {
                        checkDevice(response,session,events,deviceValue);
                    });
                else
                    getJsonDataFromFibaro(response,'baseType=com.fibaro.binarySwitch&enabled=true&visible=true&roomID='+roomID,function (events) {  //type=com.fibaro.FGWP101&
                        checkDevice(response,session,events,deviceValue,room);
                    });
            });
        }
        else
        {
        	if (deviceValue.toLowerCase().indexOf(STATE_RESPONSES.DoorLock)!==-1)
                getJsonDataFromFibaro(response,'type=com.fibaro.doorLock&enabled=true&visible=true',function (events) {
                    checkDevice(response,session,events,deviceValue);
                });
            else
                getJsonDataFromFibaro(response,'baseType=com.fibaro.binarySwitch&enabled=true&visible=true',function (events) {
                    checkDevice(response,session,events,deviceValue,room);
                });
        }
    },
    
    UsageIntent: function (intent, session, response)
    {
        console.log("UsageIntent received");
    	var deviceValue=intent.slots.Device.value;
    	var room=intent.slots.Room.value;
    	console.log(deviceValue);
        if (room!==undefined)
        {
            getRoomIDForName(response,room,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',intent.slots.Room.value));
                    return;
                }
                
                getJsonDataFromFibaro(response,'enabled=true&visible=true&roomID='+roomID,function (events) { //baseType=com.fibaro.binarySwitch&
                    var jsonContent=JSON.parse(events);
        	        var ids = jsonContent.getIdOfDeviceWithName({"name":deviceValue});
        	        if (ids===undefined||ids.length===0||ids.length>1)
        	        {
        	            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
        	            return;
        	        }
                    var power=parseFloat(ids[0].properties.power).toFixed(1).toString().replace(".", ",");
                    var result=STATE_RESPONSES.PowerUsage.replace('$Device',deviceValue).replace('$value',power);
                    logAndSay(response,result);
                });
            });
        }
        else
        {
            getJsonDataFromFibaro(response,'baseType=com.fibaro.binarySwitch&enabled=true&visible=true',function (events) {  //type=com.fibaro.FGWP101&
                var jsonContent=JSON.parse(events);
    	        var ids = jsonContent.getIdOfDeviceWithName({"name":deviceValue});
    	        if (ids===undefined||ids.length===0||ids.length>1)
    	        {
    	            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
    	            return;
    	        }
                var power=parseFloat(ids[0].properties.power).toFixed(1).toString().replace(".", ",");
                var result=STATE_RESPONSES.PowerUsage.replace('$Device',deviceValue).replace('$value',power);
                logAndSay(response,result);
            });
        }
    },
    
    SwitchIntent: function (intent, session, response)
    {
        console.log("SwitchIntent received");
    	var deviceValue=intent.slots.Device.value;
    	var statusValue=intent.slots.Status.value;
    	var janeinValue=intent.slots.Yesno.value;
    	console.log('Device: '+deviceValue);
    	// or baseType: com.fibaro.binarySwitch
    	
    	if (janeinValue!==undefined&&session.attributes.lastSwitchCommand!==undefined&&session.attributes.lastSwitch!==undefined)
    	{
    	    if (janeinValue.toLowerCase()!=STATE_RESPONSES.Yes.toLowerCase()&&janeinValue.toLowerCase()!=STATE_RESPONSES.No.toLowerCase())
        	{
        	    logAndSay(response,STATE_RESPONSES.UnknownCommand);
        	    return;
        	}
        	if (janeinValue.toLowerCase()===STATE_RESPONSES.No.toLowerCase())
        	{
        	    logAndSay(response,'Ok');
        	    return;
        	}
    	    var id=session.attributes.lastSwitch;
    	    var cmd=session.attributes.lastSwitchCommand;
        	console.log('Got yes for switching on '+id);
    	    session.attributes.lastSwitch=undefined;
    	    session.attributes.lastSwitchCommand=undefined;
    	    options.path = '/api/callAction?deviceID='+id+'&name='+cmd;
            httpreq(options, function(error) {
                if (cmd=='turnOn')
                    logAndSay(response,STATE_RESPONSES.SwitchedOn);
                else
                    logAndSay(response,STATE_RESPONSES.SwitchedOff);
                if (error!==undefined)
                {
                    logAndSay(response,STATE_RESPONSES.ErrorInAPI);
                    return;
                }
            });
            return;
    	}

    	if (deviceValue===undefined||statusValue===undefined)
    	{
    	    logAndSay(response,STATE_RESPONSES.UnknownCommand);
    	    return;
    	}
    	
    	
        getJsonDataFromFibaro(response,'baseType=com.fibaro.binarySwitch&enabled=true&visible=true',function (events) { // FGWP101
	        //console.log('Parameter: '+events);
	        var jsonContent = JSON.parse(events);
	        if (jsonContent===undefined||jsonContent.length===0)
	        {
	            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
	            return;
	        }
	        // TODO: janeinValue
	        var cmd='turnOff';
	        var cmdText=STATE_RESPONSES.SwitchedOff;
	        if (STATE_RESPONSES.On.toLowerCase().indexOf(statusValue.toLowerCase())!==-1)
	        {
	            cmd='turnOn';
	            cmdText=STATE_RESPONSES.SwitchedOn;
	        }
	        
	        var ids = jsonContent.getIdOfDeviceWithName({"name":deviceValue});
	        if (ids===undefined||ids.length===0||ids.length>1)
	        {
	            logAndSay(response,STATE_RESPONSES.NoDeviceFound);
	            return;
	        }
	        var id=ids[0].id;
	        options.path = '/api/callAction?deviceID='+id+'&name='+cmd;
                httpreq(options, function(error) {
                    logAndSay(response,cmdText);
                    if (error!==undefined)
                        logAndSayQuit(response,STATE_RESPONSES.ErrorInAPI);
            });
        });
        return;
    },
    

    OpenIntent: function (intent, session, response) {
        console.log("OpenIntent received");
	    console.log(intent.slots);
	    console.log(intent.slots.Area.value); // both is right, it depends on something...
	    //console.log(intent.slots.Preset.Name);
	    var t=intent.slots.Area.value.toLowerCase();
	    var status=intent.slots.Status.value.toLowerCase();
	    var direct=intent.slots.Direct.value!==undefined&&intent.slots.Room.value===undefined;
	    var model='doorWindowSensor'; // com.fibaro.windowSensor
	    var type='baseType';
	    var statusValue="false";
	    var statusValue2='';
	    var additional='';
	    var replacetext='';
	    var typeValue;
	    
	    STATE_RESPONSES.RemovableWords.split(" ").map(function (val) { t=t.replace(val,''); });
	    //t=t.replace(STATE_RESPONSES.RemovableWords,'');
	    t=t.trim();
	    console.log("t is: "+t);
	    console.log("Direct: "+direct);
	    console.log("Asking for status: "+status);
	    if (STATE_RESPONSES.DoorTyps.toLowerCase().indexOf(t) !== -1) 
	    {
	        console.log('Checking for doors only');
	        type='type';
	        model='doorSensor';
	        typeValue=STATE_RESPONSES.Doors;
	        if (STATE_RESPONSES.OpenTyps.toLowerCase().indexOf(status) !== -1)
	            statusValue="true";
	        replacetext=[STATE_RESPONSES.Door];
	    }
	    else if (STATE_RESPONSES.WindowTyps.indexOf(t) !== -1)
	    {
	        console.log('Checking for windows only');
	        type='type';
	        model='windowSensor';
	        typeValue=STATE_RESPONSES.Windows;
	        if (STATE_RESPONSES.OpenTyps.toLowerCase().indexOf(status) !== -1)
	            statusValue="true";
	        replacetext=[STATE_RESPONSES.Window];
	    }
	    else if (STATE_RESPONSES.DoorWindowTyps.toLowerCase().indexOf(t) !== -1) 
	    {
	        console.log('Checking for doors and windows');
	        type='baseType';
	        model='doorWindowSensor';
	        typeValue=STATE_RESPONSES.DoorsAndWindows;
	        if (STATE_RESPONSES.OpenTyps.toLowerCase().indexOf(status) !== -1)
	            statusValue="true";
	        replacetext=[STATE_RESPONSES.Door];
	        replacetext.push(STATE_RESPONSES.Door);
	    }
	    else if (STATE_RESPONSES.OpenTyps.toLowerCase().indexOf(t) !== -1)
	    {
	        console.log('Checking for lights');
	        type='baseType';
	        model='binarySwitch';
	        typeValue=STATE_RESPONSES.Lights;
	        statusValue2='0';
	        if (STATE_RESPONSES.On.toLowerCase().indexOf(status)!==-1)
	        {
	            statusValue="true"; // or >0... TODO
	            statusValue2='99';
	        }
	        //additional='"isLight":"true"';
	        additional='&interface=light';
	        replacetext=[STATE_RESPONSES.Light,STATE_RESPONSES.Lamp,STATE_RESPONSES.Dimmer];
	    }
	    else if (STATE_RESPONSES.ShutterTyps.toLowerCase().indexOf(t) !== -1)
	    {
	        console.log('Checking for roller shutters');
	        type='baseType';
	        model='FGR221';
	        typeValue=STATE_RESPONSES.Shutters;
	        if (STATE_RESPONSES.OpenTyps.toLowerCase().indexOf(status)!==-1)
	            statusValue="99";
	        else
	            statusValue="0";
	        replacetext=[STATE_RESPONSES.Shutter,STATE_RESPONSES.Shutter2];
	        console.log("Parsing shutters for status: "+statusValue);
	    }
	    
	    getJsonDataFromFibaro(response,type+'=com.fibaro.'+model+'&enabled=true&visible=true'+additional,function (events) {
	        //console.log('Parameter: '+events);
	        var jsonContent = JSON.parse(events);
	        console.log('Status checking for: '+statusValue);
	        //var ids = jsonContent.getIdOfDeviceWithName({"value":statusValue});
	        var result='';
	        console.log('Parameter: '+jsonContent);
	        console.log('Length: '+jsonContent.length);
	        
	        getJsonRoomFromFibaro(response,function(events) {
	            var rooms=JSON.parse(events);
	            var roomID=-1;
	            
	            if (intent.slots.Room.value!==undefined)
	            {
                    for(var j = 0; j < rooms.length; j++)
            	        if (rooms[j].name.toLowerCase()==intent.slots.Room.value.toLowerCase())
            	            roomID=rooms[j].id;
            	    if (roomID<0)
                    {
                        logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',intent.slots.Room.value));
                        return;
                    }
                    console.log('Filtering for room with ID '+roomID);
	            }

                var statusResponse=STATE_RESPONSES.Yes+" "+STATE_RESPONSES.AllClosed.replace('$Type',typeValue);
                var counter=0;
                var opposite=0;
    	        for(var i = 0; i < jsonContent.length; i++)
    	        {
    	            if (roomID!=-1&&jsonContent[i].roomID!=roomID)
    	                continue;
    	            counter++;
    	            if (direct) // means we are asking for close/open and so on directly
    	            {
        	            if (intent.slots.Devicename.value!==undefined&&jsonContent[i].properties.name.toLowerCase()!=intent.slots.Devicename.value.toLowerCase())
        	                continue;
        	            console.log('Found one: '+jsonContent[i].name+' with status '+jsonContent[i].properties.value);
        	            /*var status;
        	            if (model=='windowSensor'||model=='doorSensor')
        	                status=(jsonContent[i].properties.value=="true"?STATE_RESPONSES.DeviceState.Open:STATE_RESPONSES.DeviceState.Close);
        	            else if (model=='binarySwitch')
        	                status=(jsonContent[i].properties.value=="true"||jsonContent[i].properties.value!="0"?STATE_RESPONSES.DeviceState.On:STATE_RESPONSES.DeviceState.Off);
        	            else if (model=='FGR221')
        	                status=(jsonContent[i].properties.value=="0"?STATE_RESPONSES.DeviceState.Close:STATE_RESPONSES.DeviceState.jsonContent[i].properties.value=="true");*/
        	                
        	            if (jsonContent[i].properties.value.toLowerCase()!=statusValue.toLowerCase())
        	                statusResponse=STATE_RESPONSES.No+" "+STATE_RESPONSES.AllOpen.replace('$Type',typeValue);
        	            logAndSay(response,statusResponse);
                	    //logAndSay(response,STATE_RESPONSES.DeviceState.replace('$status',status).replace('$name',jsonContent[i].properties.name));
                	    return;
    	            }
    	            else
    	            {
        	            if (jsonContent[i].properties.value.toLowerCase()!=statusValue.toLowerCase())
        	            {
        	                opposite++;
        	                continue;
        	            }
        	            console.log('Found one: '+jsonContent[i].name);
        	            if (result!=='')
        	                result=result+', ';
        	            var n=jsonContent[i].name.replaceArray(replacetext, ''); //.replace('Rollladen','');
        	            n=n.replaceArrayArray();
        	            // If room name is not mentioned in device name add room name to device name
        	            if (jsonContent[i].name.indexOf(rooms[jsonContent[i].roomID])!==-1)
        	                n=STATE_RESPONSES.DeviceInRoom.replace('$Room',rooms[jsonContent[i].roomID]).replace('$Device', n);
        	            result=result+n;
    	            }
    	        }
    
                if (statusValue2!=='')	        
                {
                    //ids = jsonContent.getIdOfDeviceWithName({"value":statusValue2});
        	    for(var k = 0; k < jsonContent.length; k++)
        	    {
    	            if (jsonContent[k].properties.value.toLowerCase()!=statusValue2.toLowerCase())
    	                continue;
			        console.log('Found one: '+jsonContent[k].name);
			        if (result!=='')
        	           result=result+', ';
        	        var m=jsonContent[k].name.replaceArray(replacetext, ''); //.replace('Rollladen','');
        	        m=m.replaceArrayArray();
        	        // If room name is not mentioned in device name add room name to device name
        	        if (m.indexOf(rooms[jsonContent[k].roomID])!==-1)
        	            m=STATE_RESPONSES.DeviceInRoom.replace('$Room',rooms[jsonContent[k].roomID]).replace('$Device', m);
        	        result=result+m;
		    }
                }
    
    	        if (result==='')
    	            result=STATE_RESPONSES.NothingInState.replace('$status',status).replace('$Objects',t);
    	        else if (opposite==counter)
    	            result=STATE_RESPONSES.AllInState.replace('$status',status).replace('$Objects',t);
    	        else
    	           result=STATE_RESPONSES.ObjectsInState.replace('$status',status).replace('$Objects',t)+result;
        	    logAndSay(response,result);
        	    return;
        	});
	    });
    },

    ShutterIntent: function (intent, session, response) {
        console.log("ShutterIntent received");
	    var shutterName='';
        console.log('Shutter name: '+intent.slots.Shutter.value); // name of shutter --> translate to id

        console.log('Trying to parse');
        // baseType=com.fibaro.FGR221
        // interface=light
        // &name='+encodeURIComponent(x) not working
        var cmd='setValue';
        if (intent.slots.Direction.value!==undefined)
        {
            var direction = intent.slots.Direction.value.toLowerCase();
            if (STATE_RESPONSES.Up.toLowerCase().indexOf(direction) !== -1)
                cmd='turnOn';
            else if (STATE_RESPONSES.Down.toLowerCase().indexOf(direction) !== -1)
                cmd='turnOff';
        }

        // Mit Raumangabe
        if (intent.slots.Room.value!==undefined)
        {
            console.log('Given name of room: '+intent.slots.Room.value);
            //var additional='&roomID='+intent.slots.Room.value;
            getRoomIDForName(response,intent.slots.Room.value,function (roomID)
            {
                console.log('RoomID: '+roomID);
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',intent.slots.Room.value));
                    return;
                }
                getJsonDataFromFibaro(response,'baseType=com.fibaro.FGR221&enabled=true&visible=true&roomID='+roomID,function (events) 
                {
                    var n=intent.slots.Shutter.value;
                    var additionalNameFilter;
                    if (n!==undefined)
                    {
	                    n=replaceAllBackwards(n);
                        console.log('Modified name of shutter: '+n);
                        additionalNameFilter=[STATE_RESPONSES.Shutter+" "+n,n];
                    }
                    var addValue='';
                    if (cmd=='setValue')
                    {
                        if (intent.slots.Percent.value===undefined||intent.slots.Percent.value<0||intent.slots.Percent.value>100||intent.slots.Percent.value=='?')
                        {
                            logAndSay(response,STATE_RESPONSES.IllegalPercentValue);
                            return;
                        }
                        addValue='&arg1='+intent.slots.Percent.value;
                    }
                                            //data,response,additionalNameFilters,additionalRoomFilters,command,responseText
                    if (!sendCommandToDevices(events,response,additionalNameFilter,undefined,'name='+cmd+addValue,STATE_RESPONSES.NewStateShuttersInRoom.replace('$Room',intent.slots.Room.value)))    // Data, Additional Filter for Name, Filter for Room, Command, responseText
                        logAndSay(response,STATE_RESPONSES.NoShuttersInRoom.replace('$Room',intent.slots.Room.value));
                });
                    
            });
        }
        else
        {
            // Ohne Raumangabe
            console.log('No room given');
            getJsonDataFromFibaro(response,'baseType=com.fibaro.FGR221&enabled=true&visible=true',function (events) {
                shutterName=intent.slots.Shutter.value;
                if (shutterName===undefined)
                {
                    logAndSay(response,STATE_RESPONSES.NoNameGiven);
                    return;
                }
                shutterName=replaceAllBackwards(shutterName);
                var addValue='';
                console.log('Modified name of shutter: '+shutterName);
                if (cmd=='setValue')
                {
                    if (intent.slots.Percent.value===undefined||intent.slots.Percent.value<0||intent.slots.Percent.value>100||intent.slots.Percent.value=='?')
                    {
                        logAndSay(response,STATE_RESPONSES.IllegalPercentValue);
                        return;
                    }
                    addValue='&arg1='+intent.slots.Percent.value;
                }
                                         //data,response,additionalNameFilters,additionalRoomFilters,command,responseText
                if (!sendCommandToDevices(events,response,[STATE_RESPONSES.Shutter+" "+shutterName,shutterName],undefined,'name='+cmd+addValue,STATE_RESPONSES.NewStateShutters))    // Data, Additional Filter for Name, Filter for Room, Command, responseText
                    logAndSay(response,STATE_RESPONSES.NoShutterFound.replace('$Shutter',intent.slots.Shutter.value));
            });
        }
    },


    LightIntent: function (intent, session, response) {
        console.log("LightIntent received");
	var lightName=intent.slots.Light.value;
	var lightName2=intent.slots.Lighttwo.value;
	var roomName=intent.slots.Room.value;
	var roomName2=intent.slots.Roomtwo.value;
	var statusValue=intent.slots.Status.value;
        console.log('Trying to parse. Status: '+statusValue);

        if (statusValue===undefined)
        {
            logAndSay(response,STATE_RESPONSES.UnknownCommand);
    	    return;
        }

        var cmdValue='name=turnOff';
        var textValue=STATE_RESPONSES.LightsSwitchedOff;
        if (STATE_RESPONSES.On.toLowerCase().indexOf(statusValue.toLowerCase())!==-1)
        {
            cmdValue='name=turnOn';
            textValue=STATE_RESPONSES.LightsSwitchedOn;
        }
        
        var filter=[];
        if (lightName!==undefined&&lightName!=STATE_RESPONSES.All)
            filter.push(replaceAllBackwards(lightName));
        if (lightName2!==undefined&&lightName2!=STATE_RESPONSES.All)
            filter.push(replaceAllBackwards(lightName2));
        //console.log("[{name:"+'*'+replaceAllBackwards(lightName)+"*},{name:"+'*'+replaceAllBackwards(lightName2)+"*}]");

        if (roomName!==undefined)
        {
            getRoomIDForName(response,roomName,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomName));
                    return;
                }
                
                if (roomName2!==undefined)
                {
                    getRoomIDForName(response,roomName2,function (roomID2)
                    {
                        if (roomID2<0)
                        {
                            logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomName2));
                            return;
                        }
                        var roomIDs=[roomID,roomID2];
                        getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true',function (events) 
                        {
                            if (!sendCommandToDevices(events,response,filter,roomIDs,cmdValue,textValue))    // Data, Additional Filter for Name, Filter for Room, Command, responseText
                                logAndSay(response,STATE_RESPONSES.NoLightsFoundInRoomAndRoom2.replace('$Room1',roomName).replace('$Room2',roomName2));
                        });
                    });
                }
                
                getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true&roomID='+roomID,function (events) 
                {
                    if (!sendCommandToDevices(events,response,filter,undefined,cmdValue,textValue))    // Data, Additional Filter, Command, responseText
                        logAndSay(response,STATE_RESPONSES.NoLightsFoundInRoom.replace('$Room',roomName));
                });                
            });
        }
        else
        {
            getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true',function (events) 
            {
                if (!sendCommandToDevices(events,response,filter,undefined,cmdValue,textValue))    // Data, Additional Filter, Command, responseText
                    logAndSay(response,STATE_RESPONSES.NoLightsFound);
            });                
        }
    },


    DimIntent: function (intent, session, response) {
        console.log("DimIntent received");
	var lightName=intent.slots.Light.value;
	var roomName=intent.slots.Room.value;
	var roomName2=intent.slots.Roomtwo.value;
	var percentValue=intent.slots.Dimvalue.value;
        console.log('Trying to parse');

        if (percentValue===undefined||parseInt(percentValue)<0||parseInt(percentValue)>100)
        {
            logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
            return;
        }
        
        if (lightName===undefined)
        {
            logAndSay(response,STATE_RESPONSES.UnknownCommand);
    	    return;
        }

        var cmdValue='name=setValue&arg1='+percentValue;
        var textValue=STATE_RESPONSES.DimLight.replace('$value',percentValue);
        
        if (roomName!==undefined)
        {
            getRoomIDForName(response,roomName,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomName));
                    return;
                }
                
                if (roomName2!==undefined)
                {
                    getRoomIDForName(response,roomName2,function (roomID2)
                    {
                        if (roomID2<0)
                        {
                            logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room2',roomName2));
                            return;
                        }
                        getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true',function (events) 
                        {
                            // sendCommandToDevices(Data, response, Filter, Action, Message)
                            if (!sendCommandToDevices(events,response,lightName,[roomID,roomID2],cmdValue,textValue))    // Data, Additional Filter, Command, responseText
                                logAndSay(response,STATE_RESPONSES.NoLightsFoundInRoomAndRoom2.replace('$Room1',roomName).replace('$Room2',roomName2));
                        });
                    });
                }

                getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true&roomID='+roomID,function (events) 
                {
                    if (!sendCommandToDevices(events,response,lightName,undefined,cmdValue,textValue))
                        logAndSay(response,STATE_RESPONSES.NoLightsFoundInRoom.replace('$Room',roomName));
                });          
            });
        }
        else
        {
            getJsonDataFromFibaro(response,'interface=light&enabled=true&visible=true',function (events) 
            {
                if (!sendCommandToDevices(events,response,lightName,undefined,cmdValue,textValue))
                    logAndSay(response,STATE_RESPONSES.NoLightsFound);
            });                
        }
    },

    MovementIntent: function (intent, session, response) {
        console.log("MovementIntent received");
	var roomName=intent.slots.Room.value;

        if (roomName!==undefined)
        {   // ask for a particular room
            getRoomIDForName(response,roomName,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomName));
                    return;
                }
                
                getJsonDataFromFibaro(response,'interface=fibaroBreach&enabled=true&visible=true&roomID='+roomID,function (data) //baseType=com.fibaro.motionSensor&
                {
                    var jsonContent = JSON.parse(data);
                    var movementFound=false;
                    var lastBreached=0;
                    if (jsonContent===undefined||jsonContent.length===0)
                    {
                        logAndSay(response,STATE_RESPONSES.NoDeviceFound);
                        return;
                    }
        	        for(var i = 0; i < jsonContent.length; i++)
        	        {
        	            if (jsonContent[i].baseType=="com.fibaro.motionSensor"||jsonContent[i].type=="com.fibaro.motionSensor"||jsonContent[i].baseType=="com.fibaro.FGMS001")
        	            {
        	                console.log('Found one: '+jsonContent[i].name);
        	                if (jsonContent[i].properties.value=="true")
        	                    movementFound=true;
				            if (parseInt(jsonContent[i].properties.lastBreached)>lastBreached)
				                lastBreached=parseInt(jsonContent[i].properties.lastBreached);
        	            }
        	        }
        	        
        	        console.log("Last Breached: "+lastBreached);
        	        console.log("Now: "+new Date().getTime()/1000);
        	        lastBreached=new Date().getTime()/1000-lastBreached; // Seconds
        	        var timeType=STATE_RESPONSES.SECONDS;
        	        if (lastBreached>60)
    	            {
    	                lastBreached/=60;
    	                timeType=STATE_RESPONSES.MINUTES;
            	        if (lastBreached>60)
        	            {
        	                lastBreached/=60;
        	                timeType=STATE_RESPONSES.HOURS;
                	        if (lastBreached>24)
            	            {
            	                lastBreached/=24;
            	                timeType=STATE_RESPONSES.DAYS;
            	            }
        	            }
    	            }
    	            lastBreached=lastBreached.toFixed(0);
        	    var resp=STATE_RESPONSES.LastMovement.replace('$Time',lastBreached).replace('$Unit',timeType);
        	    if (movementFound)
        	        logAndSay(response,STATE_RESPONSES.MovementInRoom.replace('$Room',roomName)+" "+resp);
        	    else
        	        logAndSay(response,STATE_RESPONSES.NoMovementInRoom.replace('$Room',roomName)+" "+resp);
                });                
            });
        }
        else
        {   // global checking
            getJsonDataFromFibaro(response,'interface=fibaroBreach&enabled=true&visible=true',function (data)   //baseType=com.fibaro.motionSensor&
            {
                var jsonContent = JSON.parse(data);
    	        getJsonRoomFromFibaro(response,function(events) {
    	            var rooms=JSON.parse(events);
                    var movementFound=false;
                    var roomTxt=[];
                    if (jsonContent===undefined||jsonContent.length===0)
                    {
                        logAndSay(response,STATE_RESPONSES.NoDeviceFound);
                        return;
                    }
        	    for(var i = 0; i < jsonContent.length; i++)
        	    {
        	        if (jsonContent[i].baseType=="com.fibaro.motionSensor"||jsonContent[i].type=="com.fibaro.motionSensor"||jsonContent[i].baseType=="com.fibaro.FGMS001")
        	        {
                            console.log('Found one: '+jsonContent[i].name);
                            if (jsonContent[i].properties.value=="true")
                            {
                                movementFound=true;
                                roomTxt.push(rooms[jsonContent[i].roomID].name);
                            }
        	        }
        	    }
        	        
        	    if (movementFound)
        	        logAndSay(response,STATE_RESPONSES.MovementsInRooms+roomTxt.join(","));
        	    else
        	        logAndSay(response,STATE_RESPONSES.NoMovementsFound);
                });                
            });                
        }
    },


    RGBIntent: function (intent, session, response) {
        console.log("RGBIntent received");
	var lightName=intent.slots.Device.value;
	var roomName=intent.slots.Room.value;
	var redValue=intent.slots.Red.value;
	var greenValue=intent.slots.Green.value;
	var blueValue=intent.slots.Blue.value;
	var whiteValue=intent.slots.White.value;
	var programNr=intent.slots.Program.value;
	var brightValue=intent.slots.Brightness.value;
	var mode=intent.slots.Mode.value;
        console.log('Trying to parse');

        var textValue;
        var cmdValue='name=setColor&arg1='+blueValue+'&arg2='+greenValue+'&arg3='+redValue+'&arg4='+whiteValue;
        if (redValue!==undefined)
        {
            if (parseInt(redValue)<0||parseInt(redValue)>255)
            {
                logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
                return;
            }
            cmdValue='name=setR&arg1='+redValue;
            textValue=STATE_RESPONSES.RGBValueRedSet;
        }
        if (greenValue!==undefined)
        {
            if (parseInt(greenValue)<0||parseInt(greenValue)>255)
            {
                logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
                return;
            }
            cmdValue='name=setG&arg1='+greenValue;
            textValue=STATE_RESPONSES.RGBValueGreenSet;
        }
        if (blueValue!==undefined)
        {
            if (parseInt(blueValue)<0||parseInt(blueValue)>255)
            {
                logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
                return;
            }
            cmdValue='name=setB&arg1='+blueValue;
            textValue=STATE_RESPONSES.RGBValueBlueSet;
        }
        if (whiteValue!==undefined)
        {
            if (parseInt(whiteValue)<0||parseInt(whiteValue)>255)
            {
                logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
                return;
            }
            cmdValue='name=setW&arg1='+whiteValue;
            textValue=STATE_RESPONSES.RGBValueWhiteSet;
        }
        if (brightValue!==undefined)
        {
            if (parseInt(brightValue)<0||parseInt(brightValue)>255)
            {
                logAndSay(response,STATE_RESPONSES.DimValueIncorrect);
                return;
            }
            cmdValue='name=setValue&arg1='+brightValue;
            textValue=STATE_RESPONSES.RGBValueBrightnessSet;
        }
        
        if (lightName===undefined)
        {
            logAndSay(response,STATE_RESPONSES.UnknownCommand);
    	    return;
        }

        // Not setting color but getting it
        var getColor=false;
        var getProgram=false;
        if (redValue===undefined&&greenValue===undefined&&blueValue===undefined&&brightValue===undefined&&whiteValue===undefined&&programNr===undefined)
        {
            if (mode==STATE_RESPONSES.COLORS)
                getColor=true;
            else
                getProgram=true;
        }
        
        if (programNr!==undefined)
        {
            cmdValue='name=setProgram&arg1='+parseInt(programNr);
            textValue=STATE_RESPONSES.RGBProgram.replace('$value',programNr);
        }


        if (roomName!==undefined)
        {
            getRoomIDForName(response,roomName,function (roomID)
            {
                if (roomID<0)
                {
                    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomName));
                    return;
                }
                
                getJsonDataFromFibaro(response,'type=com.fibaro.colorController&interface=light&enabled=true&visible=true',function (events) 
                {
                    rgbWork(response,events,lightName,getColor,getProgram,cmdValue,textValue);
                });
            });
        }
        else
        {
            getJsonDataFromFibaro(response,'type=com.fibaro.colorController&interface=light&enabled=true&visible=true',function (events) 
            {
                rgbWork(response,events,lightName,getColor,getProgram,cmdValue,textValue);
            });                
        }
    },

    HeatingIntent: function (intent, session, response) 
    {
        console.log("HeatingIntent received");
        var roomValue=intent.slots.Room.value;
        var grad=intent.slots.Temperature.value;
        var zeit=intent.slots.Duration.value;
        var devicename=intent.slots.Devicename.value;
        var ids = [];
        console.log('Trying to parse. Grad='+grad+', Zeit='+zeit);
        
        if (grad===undefined||grad=='?'||grad<0||grad>40)
        {
            logAndSay(response,STATE_RESPONSES.TemperatureInvalid);
        	return;
        }
        if (roomValue===undefined)
        {
            logAndSay(response,STATE_RESPONSES.UnknownCommand);
    	    return;
        }
        
        getRoomIDForName(response,roomValue, function (roomID)
        {
            console.log("Found Room ID for Room "+roomValue+": "+roomID);
        	if (roomID<0)
        	{
        	    logAndSay(response,STATE_RESPONSES.RoomNotFound.replace('$Room',roomValue));
        	    return;
        	}
            // baseType=com.fibaro.FGR221
            // interface=light
            // &name='+encodeURIComponent(x) not working
            // better: baseType=com.fibaro.hvac ?
            getJsonDataFromFibaro(response,'type=com.fibaro.thermostatDanfoss&enabled=true&visible=true&roomID='+roomID, function (events) {
                console.log('Parameter: '+events);
                // Now events is the json object of all these devices
                var jsonContent = JSON.parse(events);
    
                //var responses = [];
                var completed_requests = 0;
                var withTime=!(zeit===undefined||zeit==-1);
    	        for(var i = 0; i < jsonContent.length; i++)
    	        {
    	            console.log('Found one: '+jsonContent[i].name);
    	            if (devicename!==undefined&&jsonContent[i].name.toLowerCase()!==devicename.toLowerCase())
    	                continue;
    	           ids.push(jsonContent[i].id);
    	        }
                var maxReq=withTime?ids.length*2:ids.length;
                console.log("maxReq: "+maxReq);
                
    	        for(var j = 0; j < ids.length; j++)
    	        {
                    options.path = '/api/callAction?deviceID='+ids[j]+'&name=setTargetLevel&arg1='+grad;
                    var secondpath='/api/callAction?deviceID='+ids[j]+'&name=setTime&arg1='+zeit;
                    httpreq(options, function(error) 
                    {
                        completed_requests++;
                        //responses.push(error);
                        if (!withTime && completed_requests == maxReq)
                        {
                            logAndSay(response,STATE_RESPONSES.TemperatureSet.replace('$Room',roomValue).replace('$value',grad));
                            return;
                        }
                        // like PT1H
                        var dauer=zeit.substr(2);
                        dauer=dauer.substr(0,dauer.length-1);
                        zeit=dauer*60*60+Math.floor(new Date()/1000);
                        options.path = secondpath;
                        //console.log('Sending nr '+j+': '+ids[j]);
                        httpreq(options, function(error) {
                            completed_requests++;
                            if (completed_requests == maxReq) {
                                logAndSay(response,STATE_RESPONSES.TemperatureSet.replace('$Room',roomValue).replace('$value',grad)+STATE_RESPONSES.ForTime.replace('$value',dauer));
                            }
                        });
                    });
    	        }
                });
            //logAndSay(response,STATE_RESPONSES.NoThermostatFound.replace('$Room',roomValue));

            /*getJsonDataFromFibaro(response,'type=com.fibaro.thermostatDanfoss&enabled=true&visible=true',function (events) {
                console.log("In function events");
                console.log('Parameter: '+events);
                // Now events is the json object of all these devices
                var jsonContent = JSON.parse(events);
                var device=jsonContent.getIdOfDeviceWithName({"name":"Thermostat "+roomValue});
                console.log("API found: "+device[0].id);
                if (device[0]!==undefined)
                {
                    console.log("Found: "+device[0].id);
                    options.path = '/api/callAction?deviceID='+device[0].id+'&name=setTargetLevel&arg1='+grad;
                    httpreq(options, function(error) {
                        response.tell('Temperatur vom Thermostat '+roomValue+' auf '+grad+' Grad gesetzt.');
                    });
                    
                    return;
                }
            });
            
            response.tell("Es konnte leider kein Thermostat im Room "+roomValue+" gesetzt werden");*/
        });
    }
};


EchoFibaro.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("EchoFibaro onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

EchoFibaro.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("EchoFibaro onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
    //response.tell(STATE_RESPONSES.Bye);
};

EchoFibaro.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("EchoFibaro onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    response.ask(STATE_RESPONSES.Welcome, STATE_RESPONSES.DoSomething);
    //Speak welcome message and ask user questions
    //based on whether there are players or not.
    /*storage.loadList(session, function (currentList) {
        var speechOutput = '',
            reprompt;
        if (currentList.data.items.length === 0) {
            speechOutput += 'Hi Jacob, Let\'s start your list. What\'s your first item?';
            reprompt = "Please tell me what your first item is?";
        } else if (currentList.isEmptyList()) {
            speechOutput += 'Jacob, '
                + 'you have ' + currentList.data.items.length + ' item';
            if (currentList.data.items.length > 1) {
                speechOutput += 's';
            }
            speechOutput += ' in the list. You can add another item, reset the list or exit. Which would you like?';
            reprompt = textHelper.completeHelp;
        } else {
            speechOutput += 'Jacob, What can I do for you?';
            reprompt = textHelper.nextHelp;
        }
        response.ask(speechOutput, reprompt);
    });*/
};

function httpreq(options, responseCallback, writeData) 
{
	var transport = options.useHttps ? https : http;

	console.log("Sending " + (options.useHttps ? "HTTPS" : "HTTP" ) + " request to: " + options.path);

    if (writeData !== undefined)
    {
        options.method='PUT';
    }
    
	var req = transport.request(options, function(httpResponse) 
	{
    	var body = '';

    	httpResponse.on('data', function(data) 
    	{
        	body += data;
    	});

    	httpResponse.on('end', function() 
    	{
        	if (responseCallback!==undefined) responseCallback(undefined, body);
    	});
	});

	req.on('error', function(e) 
	{
    	if (responseCallback!==undefined) 
    	    responseCallback(e);
	    console.log("Error at calling");
	});

    if (writeData !== undefined)
    {
        console.log('Sending data via '+options.method+': '+writeData);
        req.write(writeData);
        options.method='GET';
    }

	req.end();
}


function getJsonDataFromScene(response, sceneID, eventCallback) {
    var transport = options.useHttps ? https : http;
    options.path = '/api/scenes/'+sceneID+'/debugMessages';
    console.log('Called getJsonDataFromScene');
    transport.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = body; //parseJson(body);
            console.log("Result: "+stringResult);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        //console.log("Got error: ", e);
        logAndSayQuit(response,"Got error: "+e);
        return;
    });
}

function getJsonDataFromFibaro(response,filter, eventCallback) {
    var transport = options.useHttps ? https : http;
    options.path = '/api/devices?'+filter;
    console.log('Called getJsonDataFromFibaro');
    transport.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = body; //parseJson(body);
            console.log("Result: "+stringResult);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        //console.log("Got error: ", e);
        logAndSayQuit(response,"Got error: "+e);
        return;
    });
}

function getJsonRoomFromFibaro(response,eventCallback) {
    var transport = options.useHttps ? https : http;
    options.path = '/api/rooms';
    console.log('Called getJsonRoomFromFibaro');
    transport.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = body; //parseJson(body);
            console.log("Rooms: "+stringResult);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        logAndSayQuit(response,"Got error: ", e);
    });
}

function getJsonGlobalFromFibaro(response,globalVariable,eventCallback) {
    var transport = options.useHttps ? https : http;
    options.path = '/api/globalVariables/'+globalVariable;
    console.log('Called: '+options.path);
    transport.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = body; //parseJson(body);
            console.log("Global Variable: "+stringResult);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        logAndSayQuit(response,"Got error: ", e);
    });
}


function getJsonSceneFromFibaro(response,eventCallback) {
    var transport = options.useHttps ? https : http;
    options.path = '/api/scenes';
    console.log('Called getJsonSceneFromFibaro');
    transport.get(options, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = body; //parseJson(body);
            console.log(stringResult);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        logAndSayQuit(response,"Got error: ", e);
    });
}


exports.handler = (event, context, callback) => {
    var echoFibaro = new EchoFibaro();
    echoFibaro.execute(event, context);
};
