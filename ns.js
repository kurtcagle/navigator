const fs = require("fs");
var ns = class NS {
    constructor(namespaces){
        this.ns = namespaces;
    }

    load(filePath){
       var json = JSON.parse(fs.readFileSync(filePath));
       this.ns = json;
    }

    ciri(curie){
        var qnames = curie.split(/:/);
        return `${this.ns[qnames[0]]}${qnames[1]}`;
    }
    curie(iri){
        var iri = `${iri}`.replace(/(\<|\>)/g,"");
        var curieTerm = null
        var separator = iri.match("#")?"#":"/";
        var tokens = iri.split(separator);
        var term = tokens[tokens.length - 1];
        tokens.pop();
        var namespace = (separator==="#")?(tokens.join("/"))+"#":(tokens.join("/"))+"/";
        //console.log(separator==="#",namespace,term);
        var resultArr = Object.keys(this.ns).filter((prefix)=>this.ns[prefix] === namespace);
        
        if (resultArr.length == 1){curieTerm = `${resultArr[0]}:${term}`};
        return curieTerm;
    }
    turtle(){
        return Object.keys(this.ns).map((prefix)=>`@prefix ${prefix}: <${this.ns[prefix]}>.`).join("\n")+("\n");
    }
    sparql(){
        return Object.keys(this.ns).map((prefix)=>`prefix ${prefix}: <${this.ns[prefix]}>`).join("\n")+("\n");
    }
    prolog(mode="turtle"){
        switch(mode){}
        if (mode === "turtle"){
            return this.turtle(this.ns)
            }
        if (mode === "sparql"){
            return this.sparql(this.ns)
            }
        if (mode === "json"){
            return JSON.stringify(this.ns)
            }    
        if (mode === "js"){
            return JSON.assign({},this.ns);
            }    
        }
   rewrite(turtle){
      var prefixMap = {};
      turtle.split("\n").forEach((line)=>{
          var result = line.match(/\@prefix (\w+):\s*<(.+?)>\s*\./);
          if (result != null){
            prefixMap[result[1]] = {namespace:result[2],altPrefix:Object.keys(this.ns).find((key)=>this.ns[key]===result[2])}
          }
      });
      Object.keys(prefixMap).forEach((key)=>turtle = turtle.replace(eval(`/${key}\:/g`),`${prefixMap[key].altPrefix}:`))
      return turtle;
    }

rewrite(turtle){
      var prefixMap = {};
      turtle.split("\n").forEach((line)=>{
          var result = line.match(/\@prefix (\w+):\s*<(.+?)>\s*\./);
          if (result != null){
            prefixMap[result[1]] = {namespace:result[2],altPrefix:Object.keys(this.ns).find((key)=>this.ns[key]===result[2])}
          }
      });
      Object.keys(prefixMap).forEach((key)=>turtle = turtle.replace(eval(`/${key}\:/g`),`${prefixMap[key].altPrefix}:`))
      return turtle;
    };

updateNSMapFromTurtle(turtle){
      var prefixMap = {};
      turtle.split("\n").forEach((line)=>{
          var result = line.match(/\@prefix (\w+):\s*<(.+?)>\s*\./);
          if (result != null){
            prefixMap[result[1]] = result[2];
          }
      });
    this.ns = prefixMap;
    return prefixMap;
    }; 
}

module.exports = ns;