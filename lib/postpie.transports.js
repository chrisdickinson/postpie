var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('transports'),
        postgres = require('postgres');

    var PostgresTransport = function (user, host, db) {
        user = user ? "user='"+user+"' " : '';
        this.connection = postgres.createConnection(user+"host='"+host+"' dbname="+db);
        this.connection.mapTupleItems = true;
        this.host = host;
        this.db = db;
    };

    PostgresTransport.prototype.perform = function(method, resource, compiled_query, callback) {
        var sql = compiled_query.toSQL();
        this.connection.query(sql, function(err, data) {
            if(data) {
                var objects = compiled_query.backend.build_resources(data, resource);
                callback(objects, err);
            } else {
                callback([], err);
            }
        });
    };

    PostgresTransport.prototype.close = function() {
        if(this.connection) {
            this.connection.close();
        }
    };

    var PostgresTransportWrapper = function() {
        this.transport = null;
    };

    PostgresTransportWrapper.prototype.getTransport = function() {
        var settings = global.require('pieshop.settings'),
            user = settings.get_value('DB_USER'),
            host = settings.get_value('DB_HOST'),
            name = settings.get_value('DB_NAME');
        if(!host || !name) {
            throw new Error("You must define DB_HOST and DB_NAME in pieshop.settings to use postpie!");
        }

        return new PostgresTransport(user, host, name);
    };

    PostgresTransportWrapper.prototype.perform = function() {
        if(!this.transport) {
            this.transport = this.getTransport();
        }
        return this.transport.perform.apply(this.transport, arguments);
    };

    PostgresTransportWrapper.prototype.close = function() {
        if(this.transport) {
            this.transport.close();
        }
    };

    exporter('PostgresTransport', new PostgresTransportWrapper());
})(get_global_object('postpie', exp));

