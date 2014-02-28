var validators = require('../lib/validators')
  , Validator = require('../index')
  , Readable = require('stream').Readable
  , assert = require('assert');

describe('json tabular data validator', function(){

  describe('validators', function(){

    it('should validate string', function(){
      var f = validators('xsd:string');
      assert.equal(f('a'), 'a');
      assert.throws(
        function(){
          f(1);
        }, /1 is not a string/
      );  
    });

    it('should validate number', function(){
      var f = validators('xsd:double');
      assert.equal(f('1.1e3'), 1.1e3);
      assert.equal(f('0.001'), 0.001);
      assert.equal(f('NA'), null);
      assert.throws(
        function(){
          f('a');
        }, /a is not a number/
      );  
    });

    it('should validate integer', function(){
      var f = validators('xsd:integer');
      assert.equal(f('1.1e3'), 1100);
      assert.equal(f('0'), 0);
      assert.equal(f('1.0'), 1);
      assert.throws(
        function(){
          f('0.1');
        }, /0.1 is not an integer/
      );
      assert.throws(
        function(){
          f('a');
        }, /a is not an integer/
      );
    });

    it('should validate date', function(){
      var f = validators('xsd:date');
      assert.equal(f('2013-11-13').toISOString(), "2013-11-13T00:00:00.000Z");
      assert.throws(
        function(){
          f('2013/11/13');
        }, /2013\/11\/13 is not an ISO 8601 date/
      );
    });

    it('should validate datetime', function(){
      var f = validators('xsd:datetime');
      assert.deepEqual(f('2013-11-13T20:11:21+01:00'), new Date('2013-11-13T20:11:21+01:00'));
    });

    it('should validate boolean', function(){
      var f = validators('xsd:boolean');
      assert.equal(f('true'), true);
      assert.equal(f('1'), true);
      assert.equal(f('false'), false);
      assert.equal(f('0'), false);
      assert.throws(
        function(){
          f('a');
        }, /a is not a boolean/
      );
    });

    it('should validate JSON', function(){
      var f = validators('json');
      assert.deepEqual(f('{"a":1}'), {a:1});
      assert.deepEqual(f('[1,2]'), [1,2]);
      assert.throws(
        function(){
          f('a');
        }, /a is not JSON/
      );
    });

    it('should validate everything else', function(){
      var f = validators('whatever');
      assert.deepEqual(f('x'), 'x');
    });

  });


  describe('validator transform stream', function(){
    var schema = [
      {"name": "a", "valueType": "xsd:string"},
      {"name": "b", "valueType": "xsd:integer"},
      {"name": "c", "valueType": "xsd:double"},
      {"name": "d", "valueType": "xsd:date"},
      {"name": "e", "valueType": "xsd:boolean"}
    ];

    it('should create a validator transform stream properly coercing the values even if the values are already coerced', function(done){

      var data = [
        {"a": "a", "b": "1", "c": "1.2", "d": "2013-11-13", "e": "true"},
        {"a": "x", "b": "2", "c": "2.3", "d": "2013-11-14", "e": "false"},
        {"a": "y", "b": "3", "c": "3.4", "d": "2013-11-15", "e": "true"}
      ];

      var expected = [
        {"a": "a", "b": 1, "c": 1.2, "d": new Date("2013-11-13"), "e": true},
        {"a": "x", "b": 2, "c": 2.3, "d": new Date("2013-11-14"), "e": false},
        {"a": "y", "b": 3, "c": 3.4, "d": new Date("2013-11-15"), "e": true}
      ];


      var ntests = 0;
      [data, expected].forEach(function(data, i){

        var s = new Readable({objectMode:true});
        data.forEach(function(x){
          s.push(x);
        });
        s.push(null);

        var v = s.pipe(new Validator(schema));
        v.on('error', function(err){ throw err;});

        var counter = 0;
        v.on('data', function(obj){
          for(var key in obj){
            if(key === 'd'){
              assert.deepEqual(obj[key], expected[counter][key]);          
            } else {
              assert.strictEqual(obj[key], expected[counter][key]);          
            }
          }
          counter++;
        });

        v.on('end', function(){
          ntests++;
          if(ntests === 2){
            done();
          }
        });

      });

    });

    it('should throw on foreignkey errors', function(done){
      var foreignkeyValues = new Set();
      foreignkeyValues.add(new Date("2013-11-13"));
      foreignkeyValues.add(new Date("2013-11-14"));

      var s = new Readable({objectMode:true});
      s.push({"a": "y", "b": "3", "c": "3.4", "d": "2013-11-15", "e": true});
      s.push(null);

      var v = s.pipe(new Validator(schema, {d: foreignkeyValues}));
      v.on('error', function(err){
        assert.equal('2013-11-15 is not a valid value according to its foreignkey', err.message);
        done();
      });      
    });

    it('should throw on coercion validation error', function(done){
      var s = new Readable({objectMode:true});
      s.push({"a": "y", "b": "3", "c": "3.4", "d": "2013/11/15", "e": true});
      s.push(null);

      var v = s.pipe(new Validator(schema));
      v.on('error', function(err){
        assert.equal('2013/11/15 is not an ISO 8601 date', err.message);
        done();
      });
    });

    it('should work when schema is [] (or undefined)', function(done){
      var expected = {"a": "y", "b": "3", "c": "3.4", "d": "2013/11/15", "e": true};
      var s = new Readable({objectMode:true});
      s.push(expected);
      s.push(null);

      var v = s.pipe(new Validator([]));
      v.on('data', function(data){
        assert.deepEqual(data, expected);
      });
      v.on('error', function(err) {throw err;});
      v.on('end', done);
    });

  });

});
