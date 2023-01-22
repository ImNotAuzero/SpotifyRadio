const express = require('express');
const router = express.Router();
const spotify = require('../spotify.js');
const radio = require('../radio.js');
const logger = require('../utils/logger.js');
var status = 'Pending...';

router.get('/', async function(req, res, next) {
  if(!req.query.code) return logger.important(`Someone attempted to visit the callback site but with no query params: ${req.get('host')}`);

  let host = req.get('host');
  logger.important('Host attempted connection via address: ' + host);
  if(!host.includes('someCoolIP')) {
    return res.status(501).send('Unexpected error... Mismatch state...');
  }

  logger.important('Attempting to authorise spotify key...');
  let r = await spotify.auth.authorize(req.query.code); // Attempt to authorize the new code
  if(r.includes('500')) {
    logger.important('App already active, authorisation blocked');
    return res.status(200).send('App already active... Auth code invalid.');
  }

  setInterval(function() { 
    spotify.auth.refreshAccessToken(); 
  }, 3500000); 
  setInterval(function() { 
    spotify.resetPlaylist(); 
  }, 21600000)

  logger.important(r);
  status = r;

  radio.connect();

  return res.status(200).send(`App running... Response from callback: ${status}`);
});



module.exports = router;