Postpie
==========================

This is a pluggable backend for Pieshop that allows you to write persistence code that looks
and feels a bit like Django's ORM.

Examples
---------------------------
*Object level save/erase*
    var author = new Author({
        'username':'jerrylewis',
        'first_name':'jerry',
        'last_name':'lewis'
    });
    author.save(function(obj) {
        // author now has an id
        sys.puts(obj.id);
    });


    Author.objects.get({'pk':1}, function(author) {
        author.username = 'something-new';
        author.save();
    });

    Author.objects.get({'pk':2}, function(author) {
        author.delete();
    });

*Delete Queries*

    Entry.objects.filter({'id__gt':10, 'author__username__startswith':'gary'}).erase(function(objects, err) {
        sys.debug(sys.inspect(objects));
    });

*Update Queries*

    Entry.objects.filter({'author__username__startswith':'gary'}).update({
        'body':'gary wrote a post'
    }, function(objects, err) {
        sys.debug(sys.inspect(objects));
    });

*Complex Filtering, and Insert queries*

    Author.objects.filter({'username__startswith':'gary'}).all(function(objects, err) {
        var gary = objects[0];
        models.Entry.objects.create({
            title:"i'm creating objects",
            tease:"from the command line",
            slug:"creating-objects",
            body:"Hey guys, I just created this model from the command line.",
            author:gary
        }, function() {
            models.Entry.objects.filter({'slug':'creating-objects'}).all(function(objects, err) {
                sys.debug(sys.inspect(err));
            });
        });
    });

*Reverse Relations*

    Author.objects.filter({'username':'chrisdickinson'}).all(function(objects, err) {
        var author = objects[0];
        author.entry_set.all(function(objects, err) {
            sys.debug(sys.inspect(objects));
        }); 
    });

*And our friends, the models:*

    var models = require('pieshop').core,
        fields = require('pieshop').fields,
        reverse = require('wilson').urls.reverse,           // this is using a root escaperoutes pattern
        strftime = require('jsdtl').datetime.strftime;      // this is just a nicety

    exports.Author = models.resource({
        'username':fields.CharField({'max_length':255}),
        'first_name':fields.CharField({'max_length':255}),
        'last_name':fields.CharField({'max_length':255}),
        'get_absolute_url':function() {
            return reverse('author-entries', [
                this.username
            ]);
        },
        'get_full_name':function() {
            return [this.first_name, this.last_name].join(' ');
        },
        'toString':function() {
            return '<Author: "'+this.username+'">';
        },
        Meta:{
            'table':'authors',
            'ordering':'username',
        }
    });

    exports.Entry = models.resource({
        'title':fields.CharField({'max_length':255}),
        'tease':fields.CharField({'max_length':1000}),
        'slug':fields.CharField({'max_length':50}),
        'body':fields.TextField(),
        'created':fields.DateTimeField({'auto_now_add':true}),
        'author':fields.ForeignKey(exports.Author, {'related_name':'entry_set'}), 
        'get_absolute_url':function() {
            return reverse('blog-detail-view', [
                this.created.getFullYear(),
                strftime(this.created, "b"),
                this.created.getDate(),
                this.slug
            ]); 
        },
        'toString':function() {
            return '<Entry: "'+this.title+'">';
        },
        Meta:{
            'table':'entries',
            'ordering':'-created',
        }
    });


Installation
-----------------------------

    createdb postpie 
    psql -d postpie <<< "create table example_article ( \"id\" serial not null primary key, \"name\" varchar(255) not null );"
    psql -d postpie <<< "insert into example_article (\"name\") values ('test'), ('more test'), ('less test');"
    git clone http://github.com/ry/node_postgres.git
    cd node_postgres && sudo npm install . && cd ..
    git clone http://github.com/chrisdickinson/pieshop.git && cd pieshop && sudo npm install . && cd ..
    git clone http://github.com/chrisdickinson/postpie.git && cd postpie && sudo npm install . && cd examples
    node node_test.js
    open http://localhost:8124/
