//import {Todo} from './todo';

export class App {
    constructor() {
        this.serverPort = 80;
        this.serverPath = `http://localhost:${this.serverPort}`;
        this.image = '';
        this.message = "None";
        this.width = 640;
        this.count = 0;
        this.q ="";
        this.$ = (selector)=>{return document.querySelector(selector)};
        this.context = "meta:Bank";
        this.showSearch = false;
        this.showCards = true;
        this.sign = true;
        var me = this;
        this.heading = "Navigator";
        this.todos =[];
        this.todoDescription = '';
        this.searchItems =[];
        this.dataTable = null;
        this.getNS();
        this.sourcePath = `${this.serverPath}/meta/Bank.json`;  //"src/pcm/Home.json";
        this.navButtons = [
            {image:"src/media/u3.png",context:"pcm:Home"},
            {label:"Home",context:"pcm:Home"},
            {label:"Systems",context:"pcm:Systems"},
            {label:"Universal Elements",context:"pcm:UniversalElements"},
            {label:"Reference Data",context:"pcm:ReferenceData"},
            {label:"Glossary",context:"pcm:Glossary"}
            ];
        this.refresh();
        setTimeout(()=>this.configHeatmap(),500)        
    }

    getNS(){
        fetch("/src/namespaces.json")
        .then((results)=>results.json())
        .then((json)=>this.ns = json)
        .catch((e)=>console.log(e));
    }

    configHeatmap(){
        var heatmapDiv = document.querySelector(".mapid");
        this.heatmap = L.map(heatmapDiv).setView([0, 0], 1.45);
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.light',
    accessToken: 'pk.eyJ1Ijoia3VydGNhZ2xlIiwiYSI6ImNqYm84MTdwdDF0dGkzM2p2OHZ4YW9jNm8ifQ.eP-Bh9ebap5WjfrNnVhbvw'
}).addTo(this.heatmap);
        L.tileLayer('//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
                subdomains: 'abcd',
                maxZoom: 20,
                minZoom: 0,
                label: 'Toner Lite'
            }).addTo(this.heatmap);
         L.tileLayer.wms('https://firms.modaps.eosdis.nasa.gov/wms/viirs', {
                layers: 'NASA FIRMS',
                label: 'NASA Fire Hotspots'
            })             
    }


    refresh(){
        this.searchItems = [];
        fetch(this.sourcePath)
           .then((results)=>results.json())
           .then((json)=>{
                console.log(json);
                this.showSearch = json.showSearch;
                this.showCards = json.showCards;
                this.heading = json.label;
                this.count = json.count;
                this.layout = json.layout;
                this.searchItems = [];
                var navContext = this.navButtons.find((btn)=>btn.context === json.navContext);
//                console.log(navContext);
//                if (navContext){this.selectButton(this.navButtons,navContext,false)};
                json.data.forEach((item)=>{this.searchItems.push(item)});
                location.href='#';
            });
        }
    getTableCount(){
        fetch("/count.json")
        .then((results)=>results.json())
        .then((json)=>{
            console.log(json);
            this.heading = json.label;
            this.layout = json.layout;
            this.dataTable = json.data;

        })
    }
    removeListing(item) {
        let index = this.searchItems.indexOf(item);
        if (index != -1) {
            this.searchItems.splice(index, 1);
        }
    }
    selectItem(item,activate=true) {
        //this.image = item.image;
        this.searchItems.forEach((item) => item.selected = "false");
        item.selected = "true";
   //     console.log(`${item.props.alsoKnownAs} invoked.`);
        if (activate){this.activateLink(item.props.alsoKnownAs)};
        return false;
    }
    
    selectButton(items,item,activate=true) {
        items.forEach((item) => item.selected = false);
        item.selected = true;
     //   console.log(`${item.context} invoked.`);
        if (activate){this.activateLink(item)};
        return false;
    }
    
    isoDateToLocale(dateStr){
        var dt = new Date(dateStr);
     //   console.log(dt);
        return dt.toLocaleDateString()
    }
    formatInt(num){
     //   console.log(num);
        num = (typeof num === "string")?num.replace(/\"/g,''):num;
        return parseInt(num).toLocaleString()
    }
    datatype(entry){
        var re = /\^\^/;
         if (entry.includes("^^")){
            entry = {datatype:this.curie(entry.split(re)[1]),value:entry.split(re)[0]} 
         }
         else {
            entry = {datatype:"xs:string",value:entry};
         }
         console.log(entry);
         var processedValue = entry.datatype === "xs:string"?entry.value.replace(/\"/g,''):
         entry.datatype === "xs:date"?this.isoDateToLocale(entry.value):
         entry.datatype === "xs:integer"?this.formatInt(entry.value):
         entry.value.replace(/\"/g,'')
         return processedValue
    }
    search(){
    //    console.log(this.q);
        var key = this.context.replace(":","/");
        this.sourcePath =`${this.serverPath}/search.json?q=${this.q}`;
        if (this.q.length>1){this.refresh();}
        
    }
    activateLink(context){
        //console.log(`${link.context||link.value} activated.`);
        this.context = context;
        var key = context.replace(":","/");
 //       console.log("Key = ",key);
        this.sourcePath =`${this.serverPath}/${key}.json`;
        // window.history.pushState({context:context},"",`/${context.replace(/:/,"/")}`)
        console.log(this.sourcePath);
        this.refresh();
    }
    report(obj){
//        console.log(obj);
        return obj
    }
    keyIterate(obj,exclude){
        return Object.keys(obj).filter((key)=>!exclude.includes(key));
    }
    enArray(obj){
        if(Array.isArray(obj)){return obj}
        else {var arr = [];arr.push(obj);return arr;}    
    }
    metaOnly(arr){
        return arr.filter((key)=>this.isCurie(key)?(key.split(/\:/)[0]===""):key);
    }
    isCurie(expr){return expr.match(/^(\w|\d|_)+:(\w|\d|_)+$/)}
    breadcrumbs(expr){
        if (expr != null){
        var crumbTerms = this.stripQuotes(expr).split(/\//)||[];
        var crumbs = crumbTerms.map((term)=>{return {term:term,link:`meta:${term}`}})
        return crumbs;
        }
        else {
            return []
        };
    }
    stripQuotes(expr){
        if (expr){
            expr = expr.split(/\^\^/)[0] || expr;
            return expr.trim().replace(/\"(.*)\"/,'$1',"g")||"";
        }
        else {return ""}
    }
    getDataMemberCount(){
        var count = parseInt(Math.random()*1000000)
        return count.toLocaleString()
    }
    displayHeatMaps(item,count){
//        alert(`This will display a set of maps to show the distribution for '${item.props.name}'.`)
        var dlg = this.$('#heatMapDialog');
        dlg.querySelector('.heatMapMessage').textContent =`This is a place holder for the "count by country" embedded application for the term '${item.props.name}'. `;
        dlg.showModal();
    }
    closeHeatMaps(){
        var dlg = this.$('#heatMapDialog');
        dlg.close();

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

} 