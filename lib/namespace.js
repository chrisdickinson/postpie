function documentNamespace(namespace) {
    return {
        'require':function(what) {
            var split = what.split('.'),
                retval = window;
            for(var i = 0, len = split.length; i < len; ++i) {
                retval = retval[split[i]];
            }
            return retval;
        },
        'getExporter':function(name) {
            if(!name) {
                return function(export_name, to_export) { 
                    window[namespace][export_name] = to_export;
                };
            }
            window[namespace][name] = (window[namespace][name] === undefined) ? {} : window[namespace][name];
            return function(export_name, to_export) {
                window[namespace][name][export_name] = to_export;
            };
        }
    };
}

function commonjsNamespace(namespace, exp) {
    exp.require = function(what) {
        var regex = new RegExp("^" + namespace),
            retval,
            rest,
            parts;
        if(regex.test(what)) {
            return require(['./',what].join(''));
        } else {
            parts = what.split('.');
            rest = parts.slice(1);
            retval = require(parts[0]);
            for(var i = 0, len = rest.length; i < len; ++i) {
                retval = retval[rest[i]];
            }
            return retval;
        }
    };
    exp.getExporter = function(name) {
        var self = this;
        return function(export_name, to_export) {
            self[export_name] = to_export;
        };
    };
    return exp;
}

function get_global_object(namespace, exp) {
    if(exp) {
        return commonjsNamespace(namespace, exp);
    }

    if(window[namespace]) {
        return window[namespace];
    } else {
        window[namespace] = documentNamespace(namespace);
        return window[namespace];
    }
}
try {
    exports.get_global_object = get_global_object;
} catch(Error) {}
