var settings = require('./settings'),
    models = require('./models'),
    pieshop = require('pieshop').core;

var sys = require('sys'),
    http = require('http');

var Article = models.Article;

var server = http.createServer(function (req, res) {
    pieshop.query(Article).filter({'name__startswith':'more'}).all(function(objects) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        for(var i = 0, len = objects.length; i < len; ++i) {
            res.write("<li>"+objects[i]+"</li>");
        }
        res.end();
    });
});
server.addListener('close', function () {
    var transports = require('./postpie.transports');
    transports.PostgresTransport.connection.close();
    sys.puts('...Goodbye!');
});

server.listen(8124, "127.0.0.1");
sys.puts('Server running at http://127.0.0.1:8124/');
