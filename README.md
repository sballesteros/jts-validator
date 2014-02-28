jts-validator
=============

A validator for JSON tabular data available as a transform stream operating in object mode.

[![NPM](https://nodei.co/npm/jts-validator.png)](https://nodei.co/npm/jts-validator/)

Usage
=====

Given a [JSON Table Schema](http://dataprotocols.org/json-table-schema/)
for instance:

     var schema = [
       {"name": "a", "valueType": "xsd:string"},
       {"name": "b", "valueType": "xsd:integer"},
       {"name": "c", "valueType": "xsd:double"},
       {"name": "d", "valueType": "xsd:date"}
     ];

one can create a validator transform stream with:

    var Validator = require('jts-validator');
    var v = new Validator(schema);
    s.pipe(v); //s is a readable stream operating in object mode;
    v.on('data', function(coercedRow){
      //do smtg with coerced row;
    });
    v.on('error', function(err){
      //oops validation error
    });
    v.on('end', function(){
      //done!
    });

## Foreign keys support

A ```referenced``` object can be passed to the constructor to check
that the values of a field are inluded into the set of value provided
in the referenced Set. ```referenced``` is an object with:
- key equal to ```name``` value of schema entries
- values equal to an ES6 Set containing all the possible values of the field.


Tests
=====

    npm test


Licence
=======

MIT
