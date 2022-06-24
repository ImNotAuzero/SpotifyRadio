const superagent = require('superagent'), stringSimilarity = require('string-similarity'), logger = require('./utils/logger.js'), stations = require('./stations.json');
var currAccessToken, currRefreshToken, previousSong = {}, callback = '/callback';

/**
 * Function used to find a song played on the radio on spotify
 * @param {String} title - The name of the song 
 */
module.exports.findSong = function(title, station) {
  if(previousSong[station.name] === title.title) return; // Song was played or already added
  superagent.get('https://api.spotify.com/v1/search')
  .type('x-www-form-urlencoded')
  .set('Authorization', `Bearer ${currAccessToken}`)
  .query(`q=${String(title.title).replace(' ', '-')}`)
  .query(`type=track`)
  .end(async (err, res) => {
    let tracks = res.body.tracks.items;
    if(err) {
      logger.log(`${station.name}: Unexpected error when attempting to find a song on spotify...`);
      logger.log(err.stack);
    }
    else {
      for(let track in tracks) {
        if(!String(tracks[track].name).includes('Acoustic')) { // Station tested for this does not play Acoustic songs.
          for(let artist in tracks[track].artists) {
            logger.log(`${station.name}: Comparing: ${tracks[track].artists[artist].name} against \"${title.artist}\" -> ${stringSimilarity.compareTwoStrings(String(tracks[track].artists[artist].name).toLowerCase(), String(title.artist).toLowerCase())}`);
            if(stringSimilarity.compareTwoStrings(String(tracks[track].artists[artist].name).toLowerCase(), String(title.artist).toLowerCase()) > 0.32) { // 0.42 best % found from testing
              previousSong[station.name] = title.title; // Two messages from WS was sometimes recieved, this prevents the song being added twice
              return this.addToPlaylist(tracks[track], station);
            }
            else logger.log(`${station.name}: This shit didn't work this time boss!`); // No song was found that matched
          }
        }
      }
    }
  });
}

/**
 * Function used to add a song to the playlist
 * @param {Object} track 
 */
module.exports.addToPlaylist = function(track, station) {
  return new Promise(async (resolve, reject) => {
    let bool = await this.checkPreviousTrack(station, track);
    logger.log(`${station.name}: (${bool}) For current song`);
    if(bool) {
      superagent.post(`https://api.spotify.com/v1/playlists/${station.playlistID}/tracks`)
      .set('Authorization', `Bearer ${currAccessToken}`)
      .send({ 'uris': [`${track.uri}`] })
      .end((err, res) => {
        logger.log('Added some song to the playlist');
        if(err) {
          logger.log(`${station.name}: Unexpected error when attempting to add a song to a playlist...`);
          logger.log(err.stack);
        }
        else return res;
      });
    }
    else {
      return logger.log(`${station.name}: Song attempted to add is already in the playlist... Ignoring and moving on.`);
    }
  });
}

/**
 * Function used to get all tracks within a playlist
 * @returns {Object} - Track URIs from the playlist
 */
module.exports.getTracks = function(station, offset) {
  return new Promise(async (resolve, reject) => {
    superagent.get(`https://api.spotify.com/v1/playlists/${station.playlistID}/tracks`)
      .set('Authorization', `Bearer ${currAccessToken}`)
      .query( (offset) ? `fields=items(track(uri))&offset=${offset}` : `fields=items(track(uri))` )
      .end((err, res) => {
        logger.log('Recieved max 100 tracks from the playlist.');
        if(err) reject(err);
        else return resolve(res.body);
      });
  });
}

/**
 * Function used to get the total tracks within a playlist.
 * @param {Object} station - Station data 
 * 
 * @returns {Number} of tracks within the playlist
 */
module.exports.getTotalTracks = function(station) {
  return new Promise(async (resolve, reject) => {
    superagent.get(`https://api.spotify.com/v1/playlists/${station.playlistID}`)
    .set('Authorization', `Bearer ${currAccessToken}`)
    .query(`fields=tracks(total)`)
    .end((err, res) => {
      logger.log(`${station.name}: Recieved total tracks for playlist.`)
      if(err) reject(err);
      else return resolve(res.body);
    });
  });
}

/**
 * Function used to check the previous track added on the playlist.
 * @param {Object} station - Contains station data 
 * @param {Object} track - Contain track data
 * 
 * @returns {Boolean} True/False (True if the track URI's match), (False if they do not match)
 */
module.exports.checkPreviousTrack = function(station, track) {
  logger.log(`${station.name}: Checking previous track in spotify playlist...`);
  return new Promise(async (resolve, reject) => {
    let total = ((await this.getTotalTracks(station)).tracks.total) - 1; // Subtract 1 because arrays start at 0 and Spotify is weird and return queries as 1.
    logger.log(`${station.name}: Total songs in playlist is ${total}`);
    if(total == -1) return resolve(true);
    let lastTrackUri = (await this.getTracks(station, total)).items[0].track.uri; // Retrieve the last track from the returned object from @getTracks
    logger.log(`${station.name}: Previous track URI on playlist: ${lastTrackUri} & New track URI for current song is: ${track.uri}`);
    if(lastTrackUri === track.uri) return resolve(false);
    else return resolve(true);
  });
}

/**
 * Function used to delete tracks within a playlist
 * @param {Object} body - Contains URIs to delete -> ref: https://developer.spotify.com/documentation/web-api/reference/#endpoint-remove-tracks-playlist
 * 
 * @returns {Object} 
 */
module.exports.deleteTracks = function (body, station) {
  logger.log(`${station.name}: Deleting tracks...`);
  return new Promise(async (resolve, reject) => {
    superagent.delete(`https://api.spotify.com/v1/playlists/${station.playlistID}/tracks`)
      .set('Authorization', `Bearer ${currAccessToken}`)
      .type('application/json')
      .send(body)
      .end((err, res) => {
        logger.log('Deleted tracks');
        if(err) reject(err);
        else return resolve(res);
      });
  });
}

/**
 * Function used periodically to remove 100 tracks in the playlist.
 * 
 * @param {Boolean} startup - A true/false sent to this function on startup (ensures the playlist is empty each app restart) 
 */
module.exports.resetPlaylist = async function(startup) {
  logger.log(`Resetting playlist...`);

  stations.forEach(async (station) => {
    try {
      let tracks = await this.getTracks(station); // A list of track URIs.
      let totalTracks = tracks.items.length; // Total tracks in the playlist
      let i = 0;
      let body = { tracks: [] };
      while(i < 100 && i <= totalTracks) { // some logic - add 1 to i each time and if i less than track array length
        await tracks.items.forEach((item) => {
          body.tracks.push(item.track);
          i++;
        });

        // Delete Tracks
        await this.deleteTracks(body, station).catch((err) => logger.log(err.stack)).then(logger.log('Tracks deleted'));

        tracks = await this.getTracks(station);
        if(i >= totalTracks) break;
        else {
          totalTracks = tracks.items.length
          body.tracks = [];
        }
      }
    }
    catch(err) {
      logger.log(`Unexpected error occured in resetPlaylist function.`);
      logger.log(err.stack);
    }
  });
}

module.exports.auth = {
  authorize: async function(key) {
    return new Promise(async (resolve, reject) => {
      if(currAccessToken && currRefreshToken) return resolve('500 App already active...');
      logger.log('Authorize function started...');
      let authKey = await this.exchangeAuthCodeKey(key);
      currAccessToken = authKey.body.access_token;
      currRefreshToken = authKey.body.refresh_token // Doesn't change, generated once during exchange and used for refreshing access token.
      logger.log('Authorised.');
      return resolve('Authorised key, App running...');
    });
  },

  /**
   * Function used to exchange code from @function this.authorize() to a scoped access token for other functions. 
   */
  exchangeAuthCodeKey: function(key) {
    return new Promise(async (resolve, reject) => {
      superagent.post('https://accounts.spotify.com/api/token')
      .type('x-www-form-urlencoded')
      .set('Authorization', 'Basic readTheDocs')
      .send('client_id=readTheDocs')
      .send('grant_type=readTheDocs')
      .send(`code=${key}`)
      .send(`redirect_uri=${callback}`)
      .end((err, res) => {
        if(err) { console.log(err); return true; }
        else {
          logger.log('Key exchanged');
          return resolve(res);
        }
      });
    });
  },

  /**
   * Function used to generate a refreshed access token
   */
  refreshAccessToken: async function(refreshToken) {
    return new Promise(async (resolve, reject) => {
      superagent.post('https://accounts.spotify.com/api/token')
      .set('Authorization', `Basic readTheDocs`)
      .type('x-www-form-urlencoded')
      .send('grant_type=readTheDocs')
      .send(`readTheDocs=${currRefreshToken}`)
      .end((err, res) => {
        if(err) { console.log(err); return true; }
        else {
          currAccessToken = res.body.access_token;
          logger.log('Refreshed Access Token');
          return resolve(res);
        }
      });
    });
  },
}