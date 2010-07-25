Let's try this out!
    createdb postpie 
    psql -d postpie <<< "create table example_article ( \"id\" serial not null primary key, \"name\" varchar(255) not null );"
    psql -d postpie <<< "insert into example_article (\"name\") values ('test'), ('more test'), ('less test');"
    git clone http://github.com/ry/node_postgres.git
    cd node_postgres && sudo npm install . && cd ..
    git clone http://github.com/chrisdickinson/pieshop.git && cd pieshop && sudo npm install . && cd ..
    git clone http://github.com/chrisdickinson/postpie.git && cd postpie && sudo npm install . && cd examples
    node node_test.js
    open http://localhost:8124/
