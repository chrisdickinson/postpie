var defaultFieldCreator = function() {
    return function(backend, kwargs) {
        this.backend = backend;
        this.kwargs = kwargs;
    };
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
    return 'VARCHAR('+this.kwargs.max_length+')';
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
    return 'INTEGER';
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
    return 'SERIAL';
};

DateTimeField.prototype.jsToLocal = function(value) {
    return [[value.getFullYear(), value.getMonth(), value.getDate()].join('-'),
    [value.getHours(), value.getMinutes(), value.getSeconds()].join(':')].join(' ');
};

DateTimeField.prototype.localToJS = function(value) {
    return new Date(Date.parse(value.split('.')[0]));
};

DateTimeField.prototype.databaseRepresentation = function() {
    return 'TIMESTAMP';
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

exports.fields = {
    CharField:CharField,
    TextField:TextField,
    AutoField:AutoField,
    IntegerField:IntegerField,
    BooleanField:BooleanField,
    DateTimeField:DateTimeField,
    ForeignKey:ForeignKey
};
