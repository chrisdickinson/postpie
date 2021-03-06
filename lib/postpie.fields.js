var FieldPrototype = {
    databaseRepresentation: function(value) {
        var postFix = [value];
        if(this.kwargs.primary_key) {
            postFix.push('PRIMARY KEY');
        }
        if(this.kwargs.unique) {
            postFix.push('UNIQUE');
        }
        if(!this.kwargs.nullable) {
            postFix.push('NOT NULL');
        }
        return postFix.join(' '); 
    },
    getConstraint: function() {
        return null;
    }
};

var defaultFieldCreator = function() {
    var returnValue = function(backend, kwargs) {
        this.backend = backend;
        this.kwargs = kwargs || {};
    };
    returnValue.prototype = {};
    for(var i in FieldPrototype) {
        returnValue.prototype[i] = FieldPrototype[i];
    };
    return returnValue;
};

var CharField = defaultFieldCreator(),
    TextField = defaultFieldCreator(),
    IntegerField = defaultFieldCreator(),
    DateTimeField = defaultFieldCreator(),
    BooleanField = defaultFieldCreator(),
    AutoField = defaultFieldCreator(),
    ForeignKey = function(backend, rel, kwargs) {
        this.backend = backend;
        this.rel = rel;
        this.kwargs = kwargs;
    }; 

CharField.prototype.jsToLocal = function(value) {
    return "'"+String(value).replace(/'/g, "''")+"'";
};

CharField.prototype.localToJS = function(value) {
    return value;
};

CharField.prototype.getLookupValue = function(value, type) {
    switch(type) {
        case 'startswith':return this.jsToLocal(value+"%");
        case 'endswith':return this.jsToLocal("%"+value);
        case 'contains':return this.jsToLocal("%"+value+"%");
    }
    return this.jsToLocal(value);
};

CharField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['VARCHAR('+this.kwargs.max_length+')']);
};

CharField.prototype.getColumn = function(original) {
    return original; 
};

TextField.prototype.jsToLocal = function(value) {
    return "'"+String(value).replace(/'/g, "''")+"'";
};

TextField.prototype.localToJS = function(value) {
    return value;
};

TextField.prototype.getColumn = function(original) {
    return original; 
};

TextField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['TEXT']);
};

TextField.prototype.getLookupValue = function(value, type) {
    switch(type) {
        case 'startswith':return this.jsToLocal("%"+value);
        case 'endswith':return this.jsToLocal(value+"%");
        case 'contains':return this.jsToLocal("%"+value+"%");
    }
    return this.jsToLocal(value);
};

IntegerField.prototype.jsToLocal = function(value) {
    return parseInt(value, 10);
};

IntegerField.prototype.localToJS = function(value) {
    return parseInt(value, 10);
};

IntegerField.prototype.getLookupValue = function(value, type) {
    return value;
};

IntegerField.prototype.getColumn = function(original) {
    return original; 
};

IntegerField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['INTEGER']);
};

AutoField.prototype.jsToLocal = function(value) {
    return parseInt(value, 10);
};

AutoField.prototype.localToJS = function(value) {
    return parseInt(value, 10);
};

AutoField.prototype.getColumn = function(original) {
    return original; 
};

AutoField.prototype.getLookupValue = function(value, type) {
    return value;
};

AutoField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['SERIAL']);
};

DateTimeField.prototype.jsToLocal = function(value) {
    var pad = function(num) {
        if(String(num).length < 2) {
            return '0'+num;
        }
        return num;
    };
    return "'"+[[value.getFullYear(), pad(value.getMonth()), pad(value.getDate())].join('-'),
    [pad(value.getHours()), pad(value.getMinutes()), pad(value.getSeconds())].join(':')].join(' ')+"'";
};

DateTimeField.prototype.localToJS = function(value) {
    return new Date(Date.parse(value.split('.')[0]));
};

DateTimeField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['TIMESTAMP']);
};

DateTimeField.prototype.getColumn = function(original) {
    return original; 
};

BooleanField.prototype.jsToLocal = function(value) {
    return value ? 'TRUE' : 'FALSE';
};

BooleanField.prototype.localToJS = function(value) {
    return value === 'TRUE';
};

BooleanField.prototype.getColumn = function(original) {
    return original; 
};

BooleanField.prototype.databaseRepresentation = function() {
    return FieldPrototype.databaseRepresentation.apply(this, ['BOOLEAN']);
};

ForeignKey.prototype.jsToLocal = function(value) {
    return this.rel.to_field.backendToJSValue(
        this.backend, value[this.rel.to_field.name]
    );
};

ForeignKey.prototype.localToJS = function(value) {
    return value;
};

ForeignKey.prototype.getColumn = function(original) {
    return original+"_id"; 
};

ForeignKey.prototype.getLookupValue = function(value) {
    return value[this.rel.to_field.name];
};

ForeignKey.prototype.databaseRepresentation = function() {
    var repr = this.rel.to_field.getBackendField(this.backend).databaseRepresentation();
    repr = repr.replace(/(PRIMARY KEY)|(UNIQUE)|(NOT NULL)/g, '');

    return FieldPrototype.databaseRepresentation.apply(this, [repr]);
};

ForeignKey.prototype.getConstraint = function() {
    var to_table = this.rel.to_field.model.prototype._meta.opts.table,
        from_table = this.rel.from_field.model.prototype._meta.opts.table,
        from_column = this.rel.from_field.getBackendField(this.backend).getColumn(this.rel.from_field.name),
        to_column = this.rel.to_field.getBackendField(this.backend).getColumn(this.rel.to_field.name);
    return 'ALTER TABLE '+from_table+' ADD FOREIGN KEY ('+from_column+') REFERENCES '+to_table;
};


exports.fields = {
    CharField:CharField,
    TextField:TextField,
    AutoField:AutoField,
    IntegerField:IntegerField,
    BooleanField:BooleanField,
    DateTimeField:DateTimeField,
    ForeignKey:ForeignKey
};
