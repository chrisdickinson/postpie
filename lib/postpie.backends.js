var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('backends');

    var PostgresQuery = function(backend, resource, fields, values, where_clauses, limit_clauses) {
        this.backend = backend;
        this.resource = resource;
        this.fields = fields;
        this.values = values;
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
        var fields_out = [],
            table_name = this.resource.prototype._meta.opts.table;
        for(var i = 0; i < this.fields.length; ++i) {
            fields_out.push([table_name, this.fields[i]].join('.'));
        }
        var fields = fields_out.join(', '),
            where_clause = this.where_clauses.length > 0 ? 'WHERE ' + this.where_clauses.join(' AND ') : '',
            limit_clause = this.limit_clauses.length > 0 ? 'LIMIT ' + this.limit_clauses.join(',') : '',
            retval = "SELECT "+fields+" FROM "+table_name+" "+where_clause+" "+limit_clause;
        return retval;
    };

    PostgresInsertQuery.prototype.toSQL = function() {
        var field_names = [],
            field_values = [],
            table_name = this.resource.prototype._meta.opts.table;
        for(var field_name in this.values) if(this.values.hasOwnProperty(field_name)) {
            var field = this.resource.prototype._meta.get_field_by_name(field_name),
                value = field.jsToBackendValue(this.backend, this.values[field_name]);
            field_names.push(field_name);
            field_values.push(value);
        }
        return "INSERT INTO "+table_name+" ("+field_names.join(",")+") VALUES ("+field_values.join(",")+") RETURNING id";
    };

    var PostgresBackend = function () {

    };

    PostgresBackend.prototype.build_resources = function(data, resource_type) {
        var objects = [];
        for(var i = 0, len = data.length; i < len; ++i) {
            for(var field_name in data[i]) if(data[i].hasOwnProperty(field_name)) {
                var field = resource_type.prototype._meta.get_field_by_name(field_name);
                if(field) {
                    data[i][field_name] = field.backendToJSValue(this, data[i][field_name]);
                }
            }
            objects.push(new resource_type(data[i]));
        }
        return objects;
    };

    var filters = {
        'exact':function(field_name, value) {
            return [field_name, value].join(' = '); 
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
                last = parts.slice(-1)[0],
                field_name = parts[0],
                filter_type = last === field_name ? 'exact' : last,
                joins = last === field_name ? parts.slice(1) : parts.slice(1, -1),
                field = query.resource.prototype._meta.get_field_by_name(field_name),
                value = query._filters[filter];
            if(field === undefined) {
                throw new Error(field_name+" is not a valid filter field!");
            }

            var column_name = field.getBackendField(this).getColumn(field_name);


            if(filters[filter_type] === undefined) {
                filter_type = 'exact';
            }
            value = field.getPrepLookup(value, filter_type);
            where_clauses.push(filters[filter_type](column_name, field.getLookupValue(value, filter_type, this)));
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

        return new archetype(this, query.resource, ['*'], query._values, where_clauses, limit_clauses);
    };

    PostgresBackend.prototype.fields = global.require('postpie.fields').fields;
    exporter('PostgresBackend', new PostgresBackend());
})(get_global_object('postpie', exp));
