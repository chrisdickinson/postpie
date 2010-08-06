var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('backends');

    var PostgresQuery = function(backend, resource, clauses, values) {
        this.backend = backend;
        this.resource = resource;
        this.clauses = clauses;
        this.values = values;
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

    var Join = function(from_field, to_field, backend) {
        this.from_field = from_field;
        this.to_field = to_field;
        this.backend = backend;
    };

    Join.prototype.toSQL = function() {
        var from_table = this.from_field.model.prototype._meta.opts.table,
            from_column = this.from_field.getBackendField(this.backend).getColumn(this.from_field.name),
            to_table =  this.to_field.model.prototype._meta.opts.table,
            to_column = this.to_field.getBackendField(this.backend).getColumn(this.to_field.name);
        return 'INNER JOIN "'+to_table+'" ON ("'+from_table+'"."'+from_column+'" = "'+to_table+'"."'+to_column+'")';
    };

    var compileFilters = function(backend, query) {
        var table = query.resource.prototype._meta.opts.table,
            output = {
                'tables':[table],
                'where_clauses':[],
                'join_clauses':[],
                'sql_fields':[]
            },
            isFilter = function(str) {
                for(var n in filters) if (filters.hasOwnProperty(n)) {
                    if(n === str) {
                        return true;
                    }
                }
                return false;
            };
        for(var filter in query._filters) {
            var parts = filter.split('__'),
                last = parts.slice(-1)[0],
                field_name = parts[0],
                filter_type = last === field_name ? 'exact' : last,
                joins = isFilter(last) ? parts.slice(1, -1) : parts.slice(1),
                field = query.resource.prototype._meta.get_field_by_name(field_name),
                value = query._filters[filter];
            if(field === undefined) {
                throw new Error(field_name+" is not a valid filter field!");
            }
            if(filters[filter_type] === undefined) {
                filter_type = 'exact';
            }
            if(joins.length > 0) {
                // attempt to join on this field

                output.join_clauses.push(new Join(field, field.rel.to_field, backend));
                var joinFilter = {};
                joinFilter[joins.join('__')+'__'+filter_type] = value;

                var joinedFilters = compileFilters(backend, {
                    'resource':field.rel.to_model,
                    '_filters':joinFilter
                });
                for(var i = 0, len = joinedFilters.sql_fields.length; i < len; ++i) {
                    output.sql_fields.push(joinedFilters.sql_fields[i].setPrefix(field_name));
                }
                for(var i in joinedFilters) if(joinedFilters.hasOwnProperty(i) && i !== 'sql_fields') {
                    output[i] = output[i].concat(joinedFilters[i]);
                }
            } else {
                var column_name = field.getBackendField(backend).getColumn(field_name);

                value = field.getPrepLookup(value, filter_type);
                output.where_clauses.push(filters[filter_type](column_name, field.getLookupValue(value, filter_type, backend)));
            }
        }
        for(var field_name in query.resource.prototype._meta.fields) {
            // collect the appropriate fields!
            output.sql_fields.push(new SQLField(table, query.resource.prototype._meta.fields[field_name]));
        }
        return output;
    };

    var SQLField = function(table, field, prefix) {
        this.table = table;
        this.field = field;
        this.prefix = prefix === undefined ? '' : prefix;
    };

    SQLField.prototype.setPrefix = function(prefix) {
        return new SQLField(this.table, this.field, this.prefix.length > 0 ? [prefix, this.prefix].join('__') : prefix);
    };

    SQLField.prototype.toSQL = function(backend) {
        return '"'+this.table+'"."'+this.field.getBackendField(
            backend
        ).getColumn(
            this.field.name
        )+'" AS "'+(this.prefix.length > 0 ? [this.prefix, this.field.name].join('__') : this.field.name)+'"';
    };


    PostgresSelectQuery.prototype.toSQL = function() {
        var where_clause = this.clauses.where_clauses.length > 0 ? 'WHERE ' + this.clauses.where_clauses.join(' AND ') : '',
            limit_clause = this.clauses.limit_clauses.length > 0 ? 'LIMIT ' + this.clauses.limit_clauses.join(',') : '',
            table_name = this.clauses.tables.shift(),
            self = this,
            compile_joins = function(jlist) {
                var accum = [];
                for(var i = 0, len = jlist.length; i < len; ++i) {
                    accum.push(jlist[i].toSQL());
                }
                return accum.join(' ');
            },
            compile_fields = function(flist) {
                var accum = [];
                for(var i = 0, len = flist.length; i < len; ++i) {
                    accum.push(flist[i].toSQL(self.backend));
                }
                return accum.join(", ");
            },
            retval = "SELECT "+compile_fields(this.clauses.sql_fields)+" FROM "+table_name+" "+compile_joins(this.clauses.join_clauses)+" "+where_clause+" "+limit_clause;
        return retval;
    };

    PostgresInsertQuery.prototype.toSQL = function() {
        var field_names = [],
            field_values = [],
            table_name = this.resource.prototype._meta.opts.table;
        for(var field_name in this.values) if(this.values.hasOwnProperty(field_name)) {
            var field = this.resource.prototype._meta.get_field_by_name(field_name),
                value = field.jsToBackendValue(this.backend, this.values[field_name]);
            field_names.push(field.getBackendField(this.backend).getColumn(field_name));
            field_values.push(value);
        }
        return "INSERT INTO "+table_name+" ("+field_names.join(",")+") VALUES ("+field_values.join(",")+") RETURNING "+field_names.join(",");
    };

    PostgresUpdateQuery.prototype.toSQL = function() {
        
    };

    var PostgresBackend = function () {

    };

    PostgresBackend.prototype.build_resource = function(data, resource_type) {
        var relation_field_names = resource_type.prototype._meta.getForwardRelationNames(),
            data_out = {};

        for(var i = 0, len = relation_field_names.length; i < len; ++i) {
            var rel_field_name = relation_field_names[i],
                rel_field = resource_type.prototype._meta.get_field_by_name(rel_field_name),
                rel_data = {},
                rel_re = new RegExp("^"+rel_field_name+"__");
            for(var incoming_field_name in data) if(data.hasOwnProperty(incoming_field_name) && rel_re.test(incoming_field_name)) {
                rel_data[incoming_field_name.replace(rel_field_name+'__','')] = data[incoming_field_name];
                delete data[incoming_field_name];
            }
            data[rel_field_name] = this.build_resource(rel_data, rel_field.rel.to_model);
        }

        for(var field_name in data) if(data.hasOwnProperty(field_name)) {
            var field = resource_type.prototype._meta.get_field_by_name(field_name);
            if(field) {
                data_out[field_name] = field.backendToJSValue(this, data[field_name]);
            }
        }
        return new resource_type(data_out);
    };

    PostgresBackend.prototype.build_resources = function(data, resource_type) {
        var objects = [];
        for(var i = 0, len = data.length; i < len; ++i) {
            objects.push(this.build_resource(data[i], resource_type));
        }
        return objects;
    };

    var filters = {
        'exact':function(field_name, value) {
            return [field_name, value].join(' = '); 
        },
        'contains':function(field_name, value) {
            return [field_name, value].join(' LIKE ');
        },
        'in':function(field_name, values) {
            return [field_name, '('+values.join(',')+')'].join(' IN ');
        },
        'gt':function(field_name, value) {
            return [field_name, value].join(' > ');
        },
        'gte':function(field_name, value) {
            return [field_name, value].join(' >= ');
        },
        'lt':function(field_name, value) {
            return [field_name, value].join(' < ');
        },
        'lte':function(field_name, value) {
            return [field_name, value].join(' <= ');
        },
        'startswith':function(field_name, value) {
            return [field_name, value].join(' LIKE ');
        },
        'endswith':function(field_name, value) {
            return [field_name, value].join(' LIKE ');
        },
        'range':function(field_name, value) {
            return [filters.gt(field_name, value), filters.lt(field_name, value)].join(' AND ');
        },
        'isnull':function(field_name, value) {
            if(value) {
                return field_name + ' IS NULL';
            }
            return field_name + ' IS NOT NULL';
        }
    };

    PostgresBackend.prototype.compile = function(query) {
        var clauses = compileFilters(this, query);
        clauses.limit_clauses = [];
        if(query._offset) clauses.limit_clauses.push(query._offset);
        if(query._limit) clauses.limit_clauses.push(query._limit);

        var archetype = {
            'GET':PostgresSelectQuery,
            'POST':PostgresUpdateQuery,
            'PUT':PostgresInsertQuery,
            'DELETE':PostgresDeleteQuery
        }[query.method];

        return new archetype(this, query.resource, clauses, query._values);
    };

    PostgresBackend.prototype.fields = global.require('postpie.fields').fields;
    exporter('PostgresBackend', new PostgresBackend());
})(get_global_object('postpie', exp));
