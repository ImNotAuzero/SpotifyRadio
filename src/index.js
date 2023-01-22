const express = require('express');
const app = express();
const callbackRoute = require('./routes/callback.js');
const cors = require('cors');
const logger = require('./utils/logger.js');

app.use(cors());
app.use('/callback', callbackRoute);

app.get('/', (req, res, next) => {
  return res.send('SpotifyRadio CFMM online.');
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500).send('error 500');
  console.log(err);
});

app.listen(3000, () => { logger.important('App is running on port 3000'); });

module.exports = app;