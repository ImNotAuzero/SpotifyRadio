const WebSocket = require('ws');
const websocketHB = require('ws-heartbeat');
const spotify = require('./spotify.js');
const stations = require('./stations.json');
const logger = require('./utils/logger.js');
var activeStations = [];

/**
 * Function used to connect to multiple stations at once.
 * 
 * Refer to stations.json for station data and the ability to add more stations.
 */
module.exports.connect = function() {
  logger.important('Connecting to radio stations');
  stations.forEach(async (station) => {
    logger.important('Looping stations...');
    logger.important(`${station.name}: Awaiting socket controller to complete ws connection...`);
    await exports.controlSocket(station)
      .finally(logger.important(`${station.name}: connected...`));
  });
}

/**
 * Function used to prevent duplication from station error on websocket, and to reconnect a singular station rather than reconnect all
 * @param {Object} station - Station data from json
 * @returns true
 */
module.exports.controlSocket = async function(station) {
  logger.important(`${station.name}: Socket controller for station started...`);
  logger.important(`${station.name}: Connection started...`);
  let socket = new WebSocket(station.ws.url);

  socket.on('open', () => {
    if(activeStations[station.name]) return logger.log(`${station.name} Attempted to create a new connection via the ws, but one is already established...`);
    logger.log(`${station.name}: Connection created for ${station.name}`);
    activeStations.push(station.name);
    socket.send(JSON.stringify(station.ws.subscribe));
  });

  socket.on('close', (data) => {
    logger.log(`${station.name}: Socket connection closed for station: ${station.name}`);
    logger.log('\n\nSTART OF DATA');
    logger.log(data);
    logger.log('\n\nEND OF DATA');
    delete activeStations[station.name];
    socket.terminate(); // Close and delete the connection, then reconnect to the station with the passed station object.

    setTimeout(function() { exports.controlSocket(station); }, 10000); // Attempt to reconnect
  });

  socket.on('error', (data) => {
    console.error(`${station.name}: Socket encountered an error for station: ${station.name}\n `, data.message, 'Closing connection...');
    socket.close();
    logger.log(`${station.name}: Attempting to reconnect after error...`);
    delete activeStations[station.name];
    socket.terminate(); // Close and delete the connection, then reconnect to the station with the passed station object.

    setTimeout(function() { exports.controlSocket(station); }, 10000);
  });

  socket.on('message', (data) => {
    logger.log(`${station.name}: Message recieved from socket for station: ${station.name}`);
    let parsed = JSON.parse(data);
    if(parsed.now_playing.type != 'track') return;
    spotify.findSong(parsed.now_playing, station);
  });

  websocketHB.setWsHeartbeat(socket, 'heartbeat', { pingTimeout: 300000, pingInterval: 30000 }); // Let's station know we're still here

  logger.important(`${station.name}: Websocket setup completed...`);
  return true;
}