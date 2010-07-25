var settings = require('pieshop').settings;

settings.set_value('DB_HOST', 'localhost');
settings.set_value('DB_NAME', 'postpie');
settings.set_addon('backend', 'postpie.backends:PostgresBackend');
settings.set_addon('transport', 'postpie.transports:PostgresTransport');
