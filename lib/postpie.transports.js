var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('transports'),
        settings = global.require('pieshop.settings'),
        postgres = require('postgres');

    var PostgresTransport = function (host, db) {
        this.connection = postgres.createConnection("host='"+host+"' dbname="+db);
        this.connection.mapTupleItems = true;
        this.host = host;
        this.db = db;
    };

    PostgresTransport.prototype.perform = function(method, resource, compiled_query, callback) {
        var sql = compiled_query.toSQL();
        this.connection.query(sql, function(err, data) {
            if(data) {
                var objects = compiled_query.backend.build_resources(data, resource);
                callback(objects);
            } else {
                sys.puts(err);
                callback([]);
            }
        });
    };

    exporter('PostgresTransport', new PostgresTransport(settings.get_value('DB_HOST'), settings.get_value('DB_NAME')));
})(get_global_object('postpie', exp));

