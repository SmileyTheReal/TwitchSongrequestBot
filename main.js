const tmi = require('tmi.js');
const fs = require('fs');
const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

// Define configuration options
const opts = {
  identity: {
    username: '', // add the name of the account you want to use as bot name in all lowercase
    password: 'oauth:'  // add the oauth token from your bot here 
                        // this is where you can get the token 'https://twitchapps.com/tmi/'
  },
  channels: [
     '' // add your channelname here in all lowercase, you can copy it from your twitch url 
  ]
};

//global variables
var songsArray= [];
var requestOpen = true;
var songQueue;
var editRights = false;
var queueLenght = 6; // this is the lenghth of the queue you want to have

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
// Connect to Twitch:
client.connect();



function updateQueue() {  // reads the file where the queue is saved and updates the array and the string where the queue is written to for use in the code
  fs.readFile('./songrequest.txt', 'utf8' , (err, songs) => {
    if (err) {
      console.error(err)
      return
   }
    songsArray = songs.split('\n');
    if (songQueue == "" || songQueue == "\n") {
      songQueue = songs;
    }else{
      songQueue = songs + "\n";
    }
  })
  
}

function createQueue() {  // creates queue for twitchchat for queue command
  var songQueueRead = "";
  if(songsArray[0]==''){
    return 'Queue is empty right now'
  }
  for(var i=0;i<songsArray.length;i++){
    songQueueRead += (i+1) +'. ' + songsArray[i] + " ";
  }
  return songQueueRead;
}

function saveSongsToFile(){ // saves the queue to the file to keep queue between on and off of this bot if you restart it (file is also used in other ways)
  var newQueue = "";
    for (var i = 0; i < songsArray.length; i++) {
      if (newQueue == "") {
        newQueue = songsArray[i];
      }else{
        newQueue += "\n" + songsArray[i] ;
      }
    }
      fs.writeFile('./songrequest.txt', newQueue, err => {
        if(err){
          console.error(err)
          return
        }
      });
}

function removeSong(index){ // deletes song fron the queue used for remove command 
  songsArray.splice(index,1);
}

function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  editRights = false;
  updateQueue();
  if (context.mod == true || context.username == target.substr(1)) {  //gives mods and broadcaster extra rights for some commands
    editRights = true;
  }

  // Remove whitespace from chat message
  var commandName = msg.trim();

  var completeCommand = commandName;
  var commandArray = commandName.split(' ')
  var commandName = commandArray[0];
  //var songName = commandArray[1];
  
  if (commandName == '!songrequest') {
    var songName = completeCommand.substr(12);
    console.log(songName);
  }else if (commandName == '!sr') {
    var songName = completeCommand.substr(4);
    console.log(songName);
  }
  
  // If the command is known, let's execute it
  if(commandName === '!songrequest' || commandName === '!sr' && editRights == true){  //adds a song to the queue even if it is full or closed if you are mod or have the rights to do that
    var songrequest = songQueue + songName + "; " + context.username;
    fs.writeFile('./songrequest.txt', songrequest, err => {
      if(err){
        console.error(err)
        return
      }
    });
    client.say(target, `Song ${songName} has been added to the queue`)
    updateQueue();
  }
  else if(commandName === '!songrequest' || commandName === '!sr'){ //adds a song to the queue
    if (songsArray.length > queueLenght-1) { 
      client.say(target, 'Songrequest queue is full right now @' + context.username)
    } else if(requestOpen == false) {
      client.say(target, 'Songrequest is closed right now @' + context.username)
    } else {
      var songrequest = songQueue + songName + "; " + context.username;
      fs.writeFile('./songrequest.txt', songrequest, err => {
        if(err){
          console.error(err)
          return
        }
      });
      client.say(target, `Song ${songName} has been added to the queue`)
      updateQueue();
    }
  }
  else if(commandName === '!opensr' && editRights == true){ // opens the songrequest for everyone
    requestOpen = true;
    client.say(target,'Songrequest are open now! GOGOGO type !sr [songname] or !songrequest [songname] to ask for a song!');
  }
  else if(commandName === '!closesr' && editRights == true){ // closes the songrequest for everyone
    requestOpen = false;
    client.say(target,'Songrequest are closed for now!');
  }
  else if(commandName === '!queue'){  // puts out a queue of all songs in the chat
    client.say(target,createQueue());
  }else if(commandName === '!next' && editRights == true){  // used to remove the first song and tell the streamer/chat what song to do next 
    updateQueue();  
    if (songsArray[0] == "") {
    return client.say(target, 'The queue is empty right now')
    }
    client.say(target, `Next song in the queue is ${songsArray.shift()}`);
    saveSongsToFile();
    updateQueue();
  }else if(commandName === '!songrequesthelp' || commandName === '!srhelp'){  // a simple help command edit the text in quotations if you want to change the message 
    client.say(target, 'Commands: 1. !sr [songname] or !songrequest [songname] to add a song for example "!songrequest my favorite song" 2. !queue to show the queue of songs right now')
  }else if (commandName === '!clearsr' && editRights == true) { // clears the songrequest
    fs.writeFile('./songrequest.txt', "", err => {
      if(err){
        console.error(err)
        return
      }
    });
    client.say(target,'Queue has been cleared no more Songs left in the queue')
    updateQueue();
  }
  else if(commandName === '!songlist'){ // this is so people can see all the songs they can request in JD 2022/Unlimited
    client.say(target,`@${context.username} You can find a list of all songs in Just Dance 2022/Unlimited here: https://justdance.fandom.com/wiki/Just_Dance_Unlimited`);
  }
  else if(commandName === '!remove' && editRights == true){ // removes the song at the specific place 
    var index = commandArray[1];
    removeSong(index-1);
    saveSongsToFile();
  }
  else if(commandName === '!leave'){  // used to leave the queue as a viewer if you want to make space for  others or simply want to leave 
    var nameArr = [];
    var leftQueue = false;
    for(var i = 0;i < songsArray.length;i++){
      var arrText = "";
      arrText = songsArray[i];
      var arrTextSplit = arrText.split('; ');
      nameArr[i] = arrTextSplit[1];
    }
    for (var i = nameArr.length-1; i >= 0; i--) {
      if (nameArr[i] == context.username) {
        removeSong(i);
        leftQueue = true;
      }
    }
    if (leftQueue == true) {
      client.say(target,`@${context.username} you have left the queue!`);
    } else{
      client.say(target,`@${context.username} you are not in the queue!`);
    }
    updateQueue();
    saveSongsToFile();
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  fs.writeFile('./songrequest.txt', "", err => {
      if(err){
        console.error(err)
        return
      }
    });
  updateQueue();
  createQueue();
}

function expressQueue() { // creates the queue diplayed on the localhost and overlay if you add it to OBS
  updateQueue();
  var expressSongQueue = "";
  if(songsArray[0]==""){
    expressSongQueue = `<div class="divTableRow"><div class="divTableCell">`+'<font size="+10">' + "No songs in queue right now" + '</font>' + '</div></div>';
  }else{
    for (var i = 0; i < songsArray.length; i++) {
      if (expressSongQueue == undefined) {
        expressSongQueue = songsArray[i];
      }else{
        expressSongQueue +=  `<div class="divTableRow"><div class="divTableCell">` 
         +`${i+1}. ` + songsArray[i] + "<br>" + '</div></div>';
      } 
    }
  }

  return expressSongQueue;
}


app.use(express.static(path.join(__dirname, 'public'))); // adds the html for the localhost page
app.get('/', (req, res) => {
  res.send(`<head>
    <meta http-equiv="refresh" content="2">
    <link rel="stylesheet" href="songlist.css">
    </head>
    <body>
    <div class="divTable paleBlueRows">
    <div class="divTableHeading">
    <div class="divTableRow">
    <div class="divTableHead">Next Requests</div>
    </div>
    </div>
    <div class="divTableBody">
    ${expressQueue()}
    </div>
    <div class="divTableFoot tableFootStyle">
    <div class="divTableRow">
    <div class="divTableCell">Queue is open for up to ${queueLenght} request.</div>
    </div>
    </div>
    </div>
    </body>`
    );
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`) // starts the server on localhost:3000
});
