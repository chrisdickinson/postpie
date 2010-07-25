var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('backends');

    var PostgresQuery = function(backend, fields, table, where_clauses, limit_clauses) {
        this.backend = backend;
        this.fields = fields;
        this.table = table;
        this.where_clauses = where_clauses;
        this.limit_clauses = limit_clauses;
    };

    var PostgresSelectQuery = function () {
        PostgresQuery.apply(this, arguments);
    };
    var PostgresInsertQuery = function () {
        PostgresQuery.apply(this, arguments);
    };
    var PostgresUpdateQuery = function () {
        PostgresQuery.apply(this, arguments);
    };
    var PostgresDeleteQuery = function () {
        PostgresQuery.apply(this, arguments);
    };

    PostgresSelectQuery.prototype.toSQL = function() {
        var fields_out = [];
        for(var i = 0; i < this.fields.length; ++i) {
            fields_out.push([this.table, this.fields[i]].join('.'));
        }
        var fields = fields_out.join(', ');
        var where_clause = this.where_clauses.length > 0 ? 'WHERE ' + this.where_clauses.join(' AND ') : '';
        var limit_clause = this.limit_clauses.length > 0 ? 'LIMIT ' + this.limit_clauses.join(',') : '';
        return "SELECT "+fields+" FROM "+this.table+" "+where_clause+" "+limit_clause;
    };

    var PostgresBackend = function () {

    };

    PostgresBackend.prototype.build_resources = function(data, resource_type) {
        var objects = [];
        for(var i = 0, len = data.length; i < len; ++i) {
            objects.push(new resource_type(data[i]));
        }
        return objects;
    };

    var filters = {
        'exact':function(field_name, value) {
            return [field_name, value.clean()].join(' = '); 
        },
        'contains':function(field_name, value) {
            var result = value.modify(function(ov) {
                return '%'+ov+'%';
            });
            return [field_name, result.clean()].join(' LIKE ');
        },
        'in':function(field_name, values) {
            return [field_name, '('+values.clean().join(',')+')'].join(' IN ');
        },
        'gt':function(field_name, value) {
            return [field_name, value.clean()].join(' > ');
        },
        'gte':function(field_name, value) {
            return [field_name, value.clean()].join(' >= ');
        },
        'lt':function(field_name, value) {
            return [field_name, value.clean()].join(' < ');
        },
        'lte':function(field_name, value) {
            return [field_name, value.clean()].join(' <= ');
        },
        'startswith':function(field_name, value) {
            var result = value.modify(function(ov) {
                return ov+'%';
            });
            return [field_name, result.clean()].join(' LIKE ');
        },
        'endswith':function(field_name, value) {
            var result = value.modify(function(ov) {
                return '%'+ov;
            });
            return [field_name, result.clean()].join(' LIKE ');
        },
        'range':function(field_name, value) {
            var clean_value = value.clean();
            return [filters.gt(field_name, clean_value[0]), filters.lt(field_name, clean_value[1])].join(' AND ');
        },
        'isnull':function(field_name, value) {
            if(value) {
                return field_name + ' IS NULL';
            }
            return field_name + ' IS NOT NULL';
        }
    };

    PostgresBackend.prototype.compile = function(query) {
        var where_clauses = [];
        for(var filter in query._filters) {
            var parts = filter.split('__'),
                filter_type = parts.slice(-1)[0],
                field_name = parts[0],
                field = query.resource.prototype._meta.get_field_by_name(field_name),
                value = query._filters[filter]; 
            if(filters[filter_type] === undefined) {
                filter_type = 'exact';
            }
            value = field.getPrepLookup(value, filter_type);
            where_clauses.push(filters[filter_type](field_name, value));
        }
        var limit_clauses = [];
        if(query._offset) limit_clauses.push(query._offset);
        if(query._limit) limit_clauses.push(query._limit);

        var archetype = {
            'GET':PostgresSelectQuery,
            'POST':PostgresUpdateQuery,
            'PUT':PostgresInsertQuery,
            'DELETE':PostgresDeleteQuery
        }[query.method];

        return new archetype(this, ['*'], query.resource.prototype.table, where_clauses, limit_clauses);
    };

    exporter('PostgresBackend', new PostgresBackend());
})(get_global_object('postpie', exp));
