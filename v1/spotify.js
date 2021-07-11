const superagent = require('superagent'), stringSimilarity = require('string-similarity'), readline = require('readline-sync');
var currAccessToken, currRefreshToken, previousSong;

/**
 * Function used to find a song played on the radio on spotify
 * @param {String} title - The name of the song 
 */
module.exports.findSong = function(title) {
  if(previousSong === title.title) return; // Song was played or already added
  superagent.get('https://api.spotify.com/v1/search')
  .type('x-www-form-urlencoded')
  .set('Authorization', `Bearer ${currAccessToken}`)
  .query(`q=${String(title.title).replace(' ', '-')}`)
  .query(`type=track`)
  .end((err, res) => {
    if(err) console.error(err);
    else {
      for(let track in res.body.tracks.items) {
        if(!String(res.body.tracks.items[track].name).includes('Acoustic')) { // Station tested for this does not play Acoustic songs.
          for(let artist in res.body.tracks.items[track].artists) {
            console.log(`Comparing: ${res.body.tracks.items[track].artists[artist].name} against \"${title.artist}\" -> ${stringSimilarity.compareTwoStrings(res.body.tracks.items[track].artists[artist].name, title.artist)}`);
            if(stringSimilarity.compareTwoStrings(res.body.tracks.items[track].artists[artist].name, title.artist) > 0.42) { // 0.42 best % found from testing
              previousSong = title.title; // Two messages from WS was sometimes recieved, this prevents the song being added twice
              return this.addToPlaylist(res.body.tracks.items[track]);
            }
            else console.log(`This shit didn't work this time boss!`); // No song was found that matched
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
module.exports.addToPlaylist = function(track) {
  superagent.post('https://api.spotify.com/v1/playlists/<playlist>/tracks')
  .set('Authorization', `Bearer ${currAccessToken}`)
  .send({ 'uris': [`${track.uri}`] })
  .end((err, res) => {
    console.log('Added some song to the playlist');
    if(err) console.error(err);
    else return res;
  })
}


module.exports.auth = {
  /**
   * Authorization Code Flow
   */
  authorize: async function() {
    let key = await readline.question('Input Authorization Code Flow Key: ');
    if(!key) return console.log('No key provided... Quitting.'), process.exit(1);
    let authKey = await this.exchangeAuthCodeKey(key);
    currAccessToken = authKey.body.access_token;
    currRefreshToken = authKey.body.refresh_token // Doesn't change, generated once during exchange and used for refreshing access token.
    return true;
  },

  /**
   * Function used to exchange code from @function this.authorize() to a scoped access token for other functions. 
   */
  exchangeAuthCodeKey: function(key) {
    return new Promise(async (resolve, reject) => {
      superagent.post('https://accounts.spotify.com/api/token')
      .type('x-www-form-urlencoded')
      .set('Authorization', 'Basic <key>')
      .send('client_id=<client_id>')
      .send('grant_type=authorization_code')
      .send(`code=${key}`)
      .send('redirect_uri=<redirect_uri>')
      .end((err, res) => {
        if(err) return console.error(err);
        else return resolve(res);
      });
    });
  },

  /**
   * Function used to generate a refreshed access token
   */
  refreshAccessToken: async function(refreshToken) {
    return new Promise(async (resolve, reject) => {
      superagent.post('https://accounts.spotify.com/api/token')
      .set('Authorization', `Basic <key>`)
      .type('x-www-form-urlencoded')
      .send('grant_type=refresh_token')
      .send(`refresh_token=${currRefreshToken}`)
      .end((err, res) => {
        if(err) return reject(err);
        else {
          currAccessToken = res.body.access_token;
          return resolve(res);
        }
      });
    });
  },
}