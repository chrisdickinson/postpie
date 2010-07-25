var pieshop = require('pieshop'),
    fields = pieshop.fields;

var Article = pieshop.core.resource({
    'table': 'example_article',
    'id':new fields.PositiveIntegerField({'nullable':false, 'blank':false}),
    'name':new fields.CharField({'max_length':255}),
    'toString':function() {
        return 'Article: "'+this.name+'"';
    },
});

exports.Article = Article;
