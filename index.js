var fetch = require('node-fetch');
const express = require('express');
const app = express();
const NS = require('./ns.js');
var myArgs = require('optimist').argv;
var fs = require("fs");
const serverPort = 80;

var sparqlNS = `prefix pcm: <http://services.dnb.com/PCMDataServiceV2.0/>
prefix xml: <http://www.w3.org/XML/1998/namespace>
prefix shsa: <http://semanticarts.com/ns/shacl/ext/>
`;

var mimes = {
	"json":"application/json",
	"ttl":"application/x-turtle",
	"txt":"text/table",
	"xml":"application/rdf+xml",
	"csv":"text/csv"
}

class Server {
	constructor(port){

		this.tripleStore = "http://localhost:10035"

	}
}

class Main {
	constructor(){
		this.ns = new NS();
		this.ns.load("namespaces.json");
		var sparql=myArgs.q||`describe $s where {$s $p $o} limit 1`;
		sparql = sparql.replace(/\?/g,"$");
		sparql = `${sparqlNS}${sparql}`
		this.mimes = mimes;
		var format = myArgs.f||`application/json`;
		if (true){
			var port = parseInt(myArgs.p)||80;
			var server = new Server(port);
			app.get(/\/scripts\/(.*)/,(req,res)=>{
				res.set('Access-Control-Allow-Origin',"*").sendFile(req.params[0],{root: `${__dirname}/scripts/`});
			});
			app.get(/\/src\/(.*)/,(req,res)=>{
				res.set('Access-Control-Allow-Origin',"*").sendFile(req.params[0],{root: `${__dirname}/src/`});
			});
			app.get("*.html",(req,res)=>{
            	var format = "text/html";
				console.log(req.params[0]);
            	//var doc = fs.readFileSync("./index.html","utf-8");
            	//console.log(doc);
//            	var path =`/Users/kurtc/Code/dnb/app/navigator`;
				
            	res.set('Content-Type',format).set('Access-Control-Allow-Origin',"*").sendFile("index.html",{root: `${__dirname}/`});
			});
			app.get("/count.json",(req,res)=>{
				var mode = "count";
				var format = this.mimes.json;
				var sparql = this.classCount();
				this.invokeSparql(sparql,format,(results,err)=>{
					if (err){res.send({error:{message:err}})}
					else {

						var payload = {mode:mode,format:format,label:"Count",layout:"table",timestamp:(new Date()).toISOString(),data:results};
						res.set('Content-Type',format).set('Access-Control-Allow-Origin',"*").send(payload);	
					}
				})
			});
			app.get("/search.json",(req,res)=>{
				console.log("In Search Route");
				var q = req.query.q;
				var format = this.mimes.json;
				var mode = "search";
				var sparql = this.search(q,req);
				this.data = null;
				//console.log(sparql);
				this.invokeSparql(sparql,format,(results,err)=>{
					//console.log(results);
					if (err){res.send({error:{message:err}})}
					else {
						var payload = this.wrapResults(results,"search");
						payload.label = "Search" ;
						res.set('Content-Type',format).set('Access-Control-Allow-Origin',"*").send(payload);	
					}
				});
			})
			app.get(/\/(.+?)\/(.+?)\.json/,(req,res)=>{
				console.log("In Item Mode");
				this.curie = `${req.params[0]}:${req.params[1]}`
				var format = this.mimes.json;
				var mode = req.query.mode||"default";
				var sparql = mode==="search"?this.search(this.curie,req):this.describe(this.curie,req);
				this.data = null;
				//console.log(sparql);
				this.invokeSparql(sparql,format,(results,err)=>{
					//console.log(results);
					if (err){res.send({error:{message:err}})}
					else {
						var payload = this.wrapResults(results,"display");
						//payload.label = (mode==="search")?"Search":payload.structure ;
						res.set('Content-Type',format).set('Access-Control-Allow-Origin',"*").send(payload);	
					}
				});
			})
			app.get(/\/(.+?)\/(.+?)\.(txt|ttl)$/,(req,res)=>{
				this.curie = `${req.params[0]}:${req.params[1]}`
				var ext = `${req.params[2]}`;
				var format = this.mimes[ext];
				//console.log(ext,format);
				var mode = req.query.mode||"default";
				var sparql = mode==="search"?this.search(this.curie,req):this.describe(this.curie,req);
				this.data = null;
				//console.log(sparql);
				this.invokeSparql(sparql,format,(results,err)=>{
					//console.log(results);
					if (err){res.send(err)}
					else {
					res.set('Content-Type',format).send(results);	
					}
				});
			})
			app.listen(port);
		}
		else {
		//var results = this.invokeSparql(sparql,format);
		//console.log(sparql)
		}
	}

invokeSparql(sparql,format="application/json",callback){
	console.log(sparql);
	this.baseAddress = "http://localhost:10035/repositories/dnb";
	 if (format === "application/json"){
	 	var options = {"method":"GET","headers":{"Content-Type":"application/json","Accept":"application/json"}};
fetch(`${this.baseAddress}?query=${sparql}`,options)
	.then((resp)=>resp.json())
	.then((json)=>callback(json))
	.catch(error=>{callback({});console.log(error)})
	}
	else {
	 	var options = {"method":"GET","headers":{"Content-Type":format,"Accept":format}};
		fetch(`${this.baseAddress}?query=${encodeURI(sparql)}`,options)
			.then((resp)=>resp.text())
			.then((text)=>callback(text))
			.catch(error=>console.log(error))
			}
	}

	describe(curie,req){
		return this.prep(`
construct {
	  ?s ?p ?o.
      ?s rdfs:label ?sLabel.
      ?o rdfs:label ?oLabel.
	  ?link ?sLink ?s.
	  ?link ?lp ?lo.
      ?link rdfs:label ?linkLabel.
	  }
  where 
  {
      bind(${curie} as ?s)
 	  ?s ?p ?o.
      ?s rdfs:label|gist:name ?sLabel.
      optional {
      ?o rdfs:label|gist:name ?oLabel.
        }
      optional {
	  ?link ?sLink ?s.
	  ?link ?lp ?lo.
      optional {
      ?link rdfs:label|gist:name ?linkLabel.
      }
      }
  }`)
}

    classCount(){
    	return this.prep(`
SELECT ?Class (count(?s) as ?Count)
WHERE
{
  ?s a ?class .
  ?class rdfs:label ?classLabel.
  bind(concat(str(?class),"|",str(?classLabel)) as ?Class)
}
GROUP BY ?classLabel ?Class order by desc(?Count)  		
    `)
    }

	
	describeOld2(curie,req){
		return this.prep(`
construct {
	  ?s ?p ?o.
	  ?s ?p ?oAlias.
	  ?o ?op ?oo.
	  ?o ?op ?ooAlias.
	  ?link ?sLink ?s.
	  ?link gist:linkedBy ?sLink.
	  ?link ?lp ?lo.
	  ?link ?lp ?lAlias.
	  ?lo ?lop ?loo.
	  ?s gist:context meta:Context.
	  }
  where {
  {
  	{
      bind(${curie} as ?s)
    } UNION {
   		?s gist:alsoKnownAs ?alias.
   		filter(sameTerm(${curie},?alias))
    }
  }
  ?s ?p ?o.
  optional {
  	?o gist:alsoKnownAs ?oAlias.
	}
  optional {
  ?o ?op ?oo.
  optional {
  ?oo gist:alsoKnownAs ?ooAlias.
	}
}
optional {
  ?link ?sLink ?s.
  ?link ?lp ?lo.
  optional {
  ?lo ?lop ?loo.
  optional {
  ?lo gist:alsoKnownAs ?lAlias.
  }	
}
}
  }
  `)
	}

	search(q,req){
//		var q = req.query.q;
		return this.prep(`
construct {
	  ?s ?p ?o.
	  ?s gist:context meta:Context.
  }
  where {
  ?s ?p ?o.
  ?s gist:name ?name.
  filter(regex(?name,"${q}","i"))
  } order by ?name
  `)
	}


	describeOld(curie,req){
		// 	${true?`$p rdfs:domain $s.$p rdfs:range ${curie}.`:`filter(sameTerm($s,${curie})) `}

		return this.prep(`
construct {
	$sh a sh:NodeShape.
	$sh sh:targetClass $s.
	$sh sh:name $name.
	$sh sh:description $desc.
	$sh sh:property $prop.
	$prop a $propType.
	$prop sh:name $propName.
    $prop sh:path $property.
    $prop sh:datatype $datatype.
    $prop sh:class $propClass.
    $prop shsa:objectName $propClassName.
    $prop sh:minCount $minCount.
    $prop sh:maxCount $maxCount.
    $prop sh:description ?desc.
 } where { 
	$sh sh:targetClass $s.
	$sh sh:name $name.
	filter(sameTerm($s,${curie}))
	optional {
		$sh sh:description $desc.
	}
	$sh sh:property $prop.
	$prop a $propType.
	$prop sh:name $propName.
    $prop sh:path $property.
    optional {
        $prop sh:minCount $minCount.
    }
    optional {
        $prop sh:maxCount $maxCount.
    }
    optional {
        $prop sh:description ?desc.
    }
    {
    	{
    		$prop sh:datatype $datatype.
    	} UNION {
    		$prop sh:class $propClass.
    		$objShape sh:targetClass $propClass.
    		$objShape sh:name $propClassName.
    	}
	}
    	
} order by $name`);
	}
	prep(sparql){
		return `${sparqlNS}${sparql.replace(/\?/g,"$")}`;
	}
	wrapResults(results,mode){
		var curiedResults = Array.from(results).map((triple)=>Array.from(triple).map((term)=>(`${term}`.substr(0,5)==="<http")?this.ns.curie(term):term));
		//console.log(curiedResults);
 		var structure = this.mapToStructure(this.curie||"meta:Search",curiedResults)
		this.curie = this.curie||"meta:Search";
		return {
			context:this.curie||"meta:Search",
			uri:this.ns.ciri(this.curie),
			timestamp:(new Date()).toISOString(),
			label:(mode==="display")?this.curie.split(":")[1]:"Search",
			mode:mode,
			count:structure.length,
			showSearch:true,
			showCards:false,
			layout:"object",
			data:structure
			}; 

	}

	distinctNodes(triples,item,constraintFn=(triple)=>true){
		var map = {"subject":0,"predicate":1,"object":2};
		return [... new Set(triples.filter((triple)=>constraintFn(triple)).map((triple)=>triple[map[item]]))];
	}
	nodeTriples(triples,constraintFn=(triple)=>true){
		return  [... new Set(triples.filter((triple)=>constraintFn(triple)))];
	}

	isCurie(expr){return expr!=null?`${expr}`.match(/^(\w|\d|_\d)+:(\w|\d|_)+$/):false}
	
	mapToStructure(curie,triples){
		var obj = {context:{}};
		var subjectNodes = this.distinctNodes(triples,"subject",(triple)=>triple);
		//var contextNodes = this.distinctNodes(triples,"subject",(triple)=>triple[1]==="gist:context");
		var map = {};
		var struct = []
		subjectNodes.forEach((subjectNode)=>{
			var subjectTriples = this.nodeTriples(triples,(triple)=>triple[0] ===subjectNode);
			var propNodes =this.distinctNodes(subjectTriples,"predicate");
			var subjectNodeObj = {s:subjectNode,props:{},selected:"false"};
			propNodes.forEach((propNode)=>{
				var propertyTriples = this.nodeTriples(subjectTriples,(triple)=>triple[1]===propNode);

				var propNodeArr =[];

				console.log(propNode);
				if (propNode){
					var propToken = this.token(propNode);
				    propertyTriples.forEach((propTriple)=>{
				    	var object = propTriple[2];
				    	if (object!=null){
							propNodeArr.push(Object.assign(object,{}));	
							}
						if (propNode ==- "gist:alsoKnownAs" && object === curie){subjectNodeObj.selected = "true"}	
				    	})
				    subjectNodeObj.props[propToken] = propNodeArr.length!=1?propNodeArr:propNodeArr[0];
					}
				})
			struct.push(subjectNodeObj)
			})
/*		contextNodes.forEach((contextNode)=>{
			var nodeToken = map[contextNode]["gist:alsoKnownAs"][0];
			obj.context[nodeToken] = {props:{},links:[]};
			Object.keys(map[contextNode]).forEach((propKey)=>{
				var objArr = map[contextNode][propKey];
				var targetObjArr = objArr.map((item)=>this.isCurie(item)?map[item]:item);
				if (targetObjArr[0]!=null){
					obj.context[nodeToken].props[propKey]=targetObjArr;
				}
			}) */


//			console.log("Link nodes = ",linkNodes);
/*			if(nodeToken != null){
				obj.context[nodeToken] = {};
			} 
		})*/
		return struct;
	}
	token(curie){
		return curie.split(":")[1];
	}
}


new Main();

